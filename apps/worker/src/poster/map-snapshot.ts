import { createHash } from 'node:crypto';
import { cellToBoundary, cellToLatLng, getResolution, isValidCell } from 'h3-js';
import type { Sql } from 'postgres';
import type { AppConfig } from '@sap/config';

type MapboxImageType = 'image/png' | 'image/jpeg' | 'image/webp';
type FetchedImage = { image: Buffer; contentType: MapboxImageType; fetchedAt: string; styleId: string };
type CachedImage = { provider: 'mapbox'; imageBase64: string; contentType: MapboxImageType; fetchedAt: string; styleId: string };
export type MapData = { provider: 'mapbox'; styleId: string; fetchedAt: string; sourceSha256: string; stale: boolean };
export type MapMetadata = { provider: 'mapbox'; cellId: string; styleVersion: string; styleId: string;
  sourceSha256: string; fetchedAt: string; attribution: string; areaLabel: string; locality: string;
  locationMode: 'public_area'; cacheStatus: 'fresh' | 'stale'; };
export type MapSnapshot = { image: Buffer; metadata: MapMetadata; data: MapData };

const MAP_WIDTH = 480;
const MAP_HEIGHT = 288;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_STALE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const ATTRIBUTION = '© Mapbox · © OpenStreetMap contributors';
const STYLE_VERSION_PREFIX = 'vergo-mapbox-v1';
export const xml = (value: string): string => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}[character]!));

function validImage(bytes: Buffer, contentType: string): contentType is MapboxImageType {
  return (contentType === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (contentType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (contentType === 'image/webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP');
}

function decodeCache(value: unknown): FetchedImage | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<CachedImage>;
  if (data.provider !== 'mapbox' || typeof data.imageBase64 !== 'string' || data.imageBase64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8 ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(String(data.contentType)) || typeof data.fetchedAt !== 'string' ||
    !Number.isFinite(Date.parse(data.fetchedAt)) || typeof data.styleId !== 'string') return null;
  const image = Buffer.from(data.imageBase64, 'base64');
  if (!image.length || image.length > MAX_IMAGE_BYTES || !validImage(image, data.contentType!)) return null;
  return { image, contentType: data.contentType!, fetchedAt: data.fetchedAt, styleId: data.styleId };
}

/** Poster maps use only a public H3 cell. Exact report coordinates never leave the database. */
export class MapSnapshotService {
  constructor(private readonly sql: Sql, private readonly config: AppConfig) {}

  async get(cellId: string): Promise<MapSnapshot> {
    if (!isValidCell(cellId) || getResolution(cellId) !== 9) throw new Error('MAP_AREA_INVALID');
    const [lat, lon] = cellToLatLng(cellId);
    if (Math.abs(lat) > 80 || Math.abs(lon) > 179) throw new Error('MAP_AREA_UNSUPPORTED');
    const styleId = this.config.POSTER_MAPBOX_STYLE;
    const styleVersion = `${STYLE_VERSION_PREFIX}:${createHash('sha256').update(styleId).digest('hex').slice(0, 16)}`;

    const [area] = await this.sql<{ kelurahan: string; kecamatan: string; city: string }[]>`
      SELECT kelurahan,kecamatan,city FROM area_localities WHERE h3_cell=${cellId}`;
    const locality = area?.kelurahan.trim() || area?.kecamatan.trim();
    const city = area?.city.trim();
    if (!locality || !city) throw new Error('MAP_LOCATION_UNAVAILABLE');
    const areaLabel = locality === city ? locality : `${locality}, ${city}`;
    if ([...areaLabel].length > 120 || [...locality].length > 80) throw new Error('MAP_LOCATION_UNAVAILABLE');

    const [cached] = await this.sql<{ data_json: unknown; source_sha256: string; generated_at: Date | string; expires_at: Date | string }[]>`
      SELECT data_json,source_sha256,generated_at,expires_at FROM publication_map_snapshots
      WHERE cell_id=${cellId} AND style_version=${styleVersion}`;
    const decodedCache = decodeCache(cached?.data_json);
    const cachedImage = decodedCache?.styleId === styleId ? decodedCache : null;
    const generatedAt = cached ? new Date(String(cached.generated_at)).getTime() : NaN;
    const fresh = cachedImage && new Date(String(cached!.expires_at)).getTime() > Date.now();
    if (fresh) return this.snapshot(cellId, styleVersion, areaLabel, locality, cachedImage!, cached!.source_sha256, false);

    try {
      const fetched = await this.fetch(cellId, lat, lon, styleId);
      const sourceSha256 = createHash('sha256').update(fetched.image).digest('hex');
      const data: CachedImage = { provider: 'mapbox', imageBase64: fetched.image.toString('base64'),
        contentType: fetched.contentType, fetchedAt: fetched.fetchedAt, styleId };
      await this.sql`INSERT INTO publication_map_snapshots(cell_id,style_version,source_sha256,data_json,expires_at)
        VALUES(${cellId},${styleVersion},${sourceSha256},${this.sql.json(data as never)},now()+${this.config.POSTER_MAP_CACHE_HOURS}*interval '1 hour')
        ON CONFLICT(cell_id,style_version) DO UPDATE SET source_sha256=EXCLUDED.source_sha256,data_json=EXCLUDED.data_json,
          generated_at=now(),expires_at=EXCLUDED.expires_at`;
      return this.snapshot(cellId, styleVersion, areaLabel, locality,
        { ...fetched, styleId }, sourceSha256, false);
    } catch (error) {
      if (cachedImage && Number.isFinite(generatedAt) && Date.now() - generatedAt <= MAX_STALE_AGE_MS) {
        return this.snapshot(cellId, styleVersion, areaLabel, locality, cachedImage, cached!.source_sha256, true);
      }
      throw error;
    }
  }

  private snapshot(cellId: string, styleVersion: string, areaLabel: string, locality: string,
    source: { image: Buffer; contentType: MapboxImageType; fetchedAt: string; styleId: string }, sourceSha256: string,
    stale: boolean): MapSnapshot {
    return { image: source.image, metadata: { provider: 'mapbox', cellId, styleVersion, styleId: source.styleId,
      sourceSha256, fetchedAt: source.fetchedAt, attribution: ATTRIBUTION, areaLabel, locality,
      locationMode: 'public_area', cacheStatus: stale ? 'stale' : 'fresh' },
      data: { provider: 'mapbox', styleId: source.styleId, fetchedAt: source.fetchedAt, sourceSha256, stale } };
  }

  private async fetch(cellId: string, lat: number, lon: number, styleId: string): Promise<FetchedImage> {
    const token = this.config.POSTER_MAPBOX_TOKEN;
    if (!token) throw new Error('MAP_PROVIDER_UNCONFIGURED');
    const polygon = cellToBoundary(cellId).map(([latitude, longitude]) => [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))]);
    polygon.push(polygon[0]!);
    const feature = { type: 'Feature', properties: { fill: '#f6cd3f', 'fill-opacity': 0.24,
      stroke: '#14694a', 'stroke-width': 2.5, 'stroke-opacity': 1 }, geometry: { type: 'Polygon', coordinates: [polygon] } };
    const overlay = `geojson(${encodeURIComponent(JSON.stringify(feature))})`;
    const url = new URL(`https://api.mapbox.com/styles/v1/${styleId}/static/${overlay}/${lon.toFixed(6)},${lat.toFixed(6)},15.5/480x288@2x.png`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('logo', 'true');
    url.searchParams.set('attribution', 'true');

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.reserveDailyBudget();
      let retry = false;
      try {
        const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000),
          headers: { 'user-agent': 'VERGO-PosterRenderer/1.0', accept: 'image/png,image/jpeg,image/webp' } });
        if (!response.ok) {
          retry = response.status === 408 || response.status === 429 || response.status >= 500;
          if (!retry || attempt === 2) throw new Error('MAP_PROVIDER_UNAVAILABLE');
          const retryAfter = Number(response.headers.get('retry-after'));
          const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 2000) : 250 * (2 ** attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim() ?? '';
        const reader = response.body?.getReader();
        if (!reader) throw new Error('MAP_PROVIDER_UNAVAILABLE');
        const chunks: Uint8Array[] = [];
        let total = 0;
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            total += part.value.length;
            if (total > MAX_IMAGE_BYTES) throw new Error('MAP_PROVIDER_UNAVAILABLE');
            chunks.push(part.value);
          }
        } finally { await reader.cancel(); }
        const image = Buffer.concat(chunks);
        if (!validImage(image, contentType)) throw new Error('MAP_PROVIDER_UNAVAILABLE');
        return { image, contentType, fetchedAt: new Date().toISOString(), styleId };
      } catch (error) {
        if (error instanceof Error && error.message === 'MAP_PROVIDER_UNAVAILABLE') throw error;
        retry = true;
        if (attempt === 2) throw new Error('MAP_PROVIDER_UNAVAILABLE');
      }
      if (retry) await new Promise(resolve => setTimeout(resolve, 250 * (2 ** attempt)));
    }
    throw new Error('MAP_PROVIDER_UNAVAILABLE');
  }

  private async reserveDailyBudget(): Promise<void> {
    await this.sql.begin(async tx => {
      const date = await tx<{ day: string }[]>`SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text AS day`;
      await tx`INSERT INTO publication_map_budgets(budget_date) VALUES(${date[0]!.day}) ON CONFLICT DO NOTHING`;
      const [budget] = await tx<{ request_count: number }[]>`SELECT request_count FROM publication_map_budgets WHERE budget_date=${date[0]!.day} FOR UPDATE`;
      if (!budget || budget.request_count >= this.config.POSTER_MAP_DAILY_LIMIT) throw new Error('MAP_DAILY_BUDGET_EXHAUSTED');
      await tx`UPDATE publication_map_budgets SET request_count=request_count+1 WHERE budget_date=${date[0]!.day}`;
    });
  }
}

import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { latLngToCell } from 'h3-js';
import { PosterRenderer, assertPosterFonts, posterReportCode } from '../src/poster/poster-renderer.js';
import { MapSnapshotService } from '../src/poster/map-snapshot.js';

const cellId = latLngToCell(-7.98, 112.63, 9);
const cachedImage = await sharp({create:{width:640,height:384,channels:3,background:'#dce7dd'}}).png().toBuffer();

function dependencies(options: { expiresAt?: Date; generatedAt?: Date } = {}) {
  const sql = Object.assign(async (parts: TemplateStringsArray) => {
    const statement = parts.join(' ').replace(/\s+/g, ' ');
    if (statement.includes('FROM area_localities')) {
      return [{ kelurahan: 'Kauman', kecamatan: 'Klojen', city: 'Kota Malang' }];
    }
    if (statement.includes('AT TIME ZONE')) return [{ day:'2026-10-17' }];
    if (statement.includes('SELECT request_count')) return [{ request_count:0 }];
    if (statement.includes('FROM publication_map_snapshots')) {
      return [{ data_json: { provider:'mapbox',imageBase64:cachedImage.toString('base64'),contentType:'image/png',
        fetchedAt:'2026-10-16T00:00:00.000Z',styleId:'mapbox/streets-v12' }, source_sha256:'a'.repeat(64),
        generated_at:options.generatedAt??new Date(), expires_at:options.expiresAt??new Date(Date.now()+60_000) }];
    }
    return [];
  }, {
    json: (value: unknown) => value,
    begin: async (work: (tx: any) => Promise<unknown>) => work(sql as any),
  });
  const config = {
    APP_ORIGIN: 'https://vergo.example',
    SAP_INSTAGRAM_RENDER_ENABLED: true,
    POSTER_MAPBOX_TOKEN: 'pk.test-token',
    POSTER_MAPBOX_STYLE: 'mapbox/streets-v12',
    POSTER_MAP_CACHE_HOURS: 24,
    POSTER_MAP_DAILY_LIMIT: 100,
  };
  return {sql:sql as never,config:config as never};
}

function uncachedDependencies() {
  let requestCount = 0;
  const sql: any = async (parts: TemplateStringsArray) => {
    const statement = parts.join(' ').replace(/\s+/g, ' ');
    if (statement.includes('FROM area_localities')) return [{ kelurahan:'Kauman',kecamatan:'Klojen',city:'Kota Malang' }];
    if (statement.includes('FROM publication_map_snapshots')) return [];
    if (statement.includes('AT TIME ZONE')) return [{ day:'2026-10-17' }];
    if (statement.includes('SELECT request_count')) return [{ request_count:requestCount }];
    if (statement.includes('UPDATE publication_map_budgets SET request_count')) requestCount += 1;
    return [];
  };
  sql.json = (value: unknown) => value;
  sql.begin = async (work: (tx: any) => Promise<unknown>) => work(sql);
  const config = {
    APP_ORIGIN:'https://vergo.example', SAP_INSTAGRAM_RENDER_ENABLED:true,
    POSTER_MAPBOX_TOKEN:'pk.test-token', POSTER_MAPBOX_STYLE:'mapbox/streets-v12',
    POSTER_MAP_CACHE_HOURS:168, POSTER_MAP_DAILY_LIMIT:100,
  };
  return {sql:sql as never,config:config as never};
}

test('bundled fonts render distinct Latin glyphs rather than missing-font squares', assertPosterFonts);
test('poster-facing report code uses VERGO branding while database identifiers remain compatible', () => {
  assert.equal(posterReportCode('SAP-123456'), 'VERGO-123456');
  assert.equal(posterReportCode('VERGO-123456'), 'VERGO-123456');
});

test('map uses a cached Mapbox image and verified locality labels for the public H3 area', async () => {
  const {sql,config}=dependencies();
  const result=await new MapSnapshotService(sql,config).get(cellId);
  assert.ok(result.image.length > 0);
  assert.equal(result.metadata.provider,'mapbox');
  assert.equal(result.metadata.styleId,'mapbox/streets-v12');
  assert.match(result.metadata.styleVersion,/^vergo-mapbox-v1:/);
  assert.equal(result.metadata.cacheStatus,'fresh');
  assert.equal(result.metadata.areaLabel,'Kauman, Kota Malang');
  assert.equal(result.metadata.locationMode,'public_area');
  assert.match(result.metadata.attribution,/Mapbox.*OpenStreetMap/);
});

test('map fetch sends only the public H3 area to Mapbox and stores a real static image', async () => {
  const {sql,config}=uncachedDependencies();
  const previousFetch=globalThis.fetch;
  let requested:URL|undefined;
  globalThis.fetch=(async input=>{
    requested=new URL(String(input));
    return new Response(cachedImage,{status:200,headers:{'content-type':'image/png'}});
  }) as typeof fetch;
  try {
    const result=await new MapSnapshotService(sql,config).get(cellId);
    assert.equal(requested?.hostname,'api.mapbox.com');
    assert.match(requested?.pathname??'',/\/styles\/v1\/mapbox\/streets-v12\/static\/geojson\(/);
    assert.match(requested?.pathname??'',/\/480x288@2x\.png$/);
    assert.equal(requested?.searchParams.get('access_token'),'pk.test-token');
    assert.equal(result.metadata.cacheStatus,'fresh');
    assert.equal(result.data.provider,'mapbox');
    assert.equal(result.image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  } finally { globalThis.fetch=previousFetch; }
});

test('map uses a dated stale snapshot after Mapbox remains unavailable', async () => {
  const {sql,config}=dependencies({expiresAt:new Date(Date.now()-1),generatedAt:new Date(Date.now()-10*24*60*60*1000)});
  const previousFetch=globalThis.fetch;
  let attempts=0;
  globalThis.fetch=(async ()=>{
    attempts+=1;
    return new Response(null,{status:502,headers:{'retry-after':'0.001'}});
  }) as typeof fetch;
  try {
    const result=await new MapSnapshotService(sql,config).get(cellId);
    assert.equal(attempts,3);
    assert.equal(result.metadata.cacheStatus,'stale');
    assert.equal(result.data.stale,true);
    assert.equal(result.metadata.fetchedAt,'2026-10-16T00:00:00.000Z');
  } finally { globalThis.fetch=previousFetch; }
});

test('renders a design-sized sRGB poster and uses verified locality and city names', async () => {
  const photo = await sharp({
    create: { width: 1400, height: 900, channels: 3, background: '#54825e' },
  }).png().toBuffer();
  const {sql,config}=dependencies();
  const rendered = await new PosterRenderer(sql,config).render({
    source: {
      reportId: '11111111-1111-4111-8111-111111111111',
      sourceRevision: 3,
      scanId: null,
      status: 'verified',
      occurredAt: '2026-10-04T02:15:00.000Z',
      area: { cellId, label: `Area ${cellId}` },
      title: 'Laporan uji',
      categoryName: 'Plastik',
      mediaId: '22222222-2222-4222-8222-222222222222',
      publicSummary: 'Fixture render internal.',
    },
    photo,
    outcome: 'initial',
    reportCode: 'SAP-123456',
  });

  const metadata = await sharp(rendered.bytes).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 1080);
  assert.equal(metadata.height, 1350);
  assert.equal(metadata.space, 'srgb');
  assert.ok(rendered.bytes.length <= 7 * 1024 * 1024);
  assert.equal(rendered.templateVersion, 'vergo-feed-status-v6');
  assert.equal(rendered.map.areaLabel, 'Kauman, Kota Malang');
  assert.equal(rendered.map.locality, 'Kauman');
  assert.equal(rendered.map.locationMode, 'public_area');
  assert.match(rendered.map.attribution, /OpenStreetMap contributors/);
  assert.equal(rendered.source.publicUrl, 'https://vergo.example/incidents/11111111-1111-4111-8111-111111111111');
  assert.equal(rendered.source.canonicalId, rendered.source.reportId);
  assert.equal(rendered.source.area.label, 'Kauman, Kota Malang');
  assert.equal(rendered.source.title, 'Penumpukan sampah di kawasan Kauman');
});

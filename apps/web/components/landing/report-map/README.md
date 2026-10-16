# Landing report map

The approved map mockup is implemented with native UI and real Mapbox geometry;
no screenshot, demonstration counts, or invented district labels ship in the page.

## Asset and component separation

- `map-data.ts`: Malang camera, risk palette, aggregate-cell polygons and centers.
- `mapbox-canvas.tsx`: lazy SDK import, Standard style, 3D buildings, GeoJSON layers,
  camera controls, resize and disposal. Coordinates come only from public H3 cells.
- `map-viewport.tsx`: accessible 2D/3D buttons, area card, home control and honest
  Leaflet fallback for unavailable configuration, authorization or WebGL.
- `report-map.module.css`: scoped responsive layout and motion preferences.
- `../../public-map-section.tsx`: existing API date range, abort/debounce, locality
  batches, searchable complete area list and existing public incident links.
- Icons use the existing Lucide SVG assets. No new raster assets are necessary.

## Runtime configuration

Set `MAPBOX_PUBLIC_TOKEN` in **web runtime environment only**, or in the ignored
`apps/web/.env.local` during local development. Use a Mapbox `pk.` browser token;
secret `sk.` tokens are rejected. Never commit the token or real environment files.

`GET /api/map-config` returns only this public token at request time with no-store.
It is necessarily visible to a browser using Mapbox. All other server environment
values remain server-side. Restrict the token's allowed origins in Mapbox to your
production and development URLs. No build-time token or image rebuild is needed
to rotate it. Missing configuration returns 503 and activates the existing 2D map.

The SDK starts only as the section approaches the viewport. Standard supplies the
basemap and real 3D buildings where Mapbox has coverage; the 2D button flattens the
camera and hides 3D objects. Cell color indicates API risk, not building height.
No automatic orbit, geolocation, geocoding or report-coordinate lookup is used.
Camera transitions honor reduced motion. Cooperative gestures preserve page scroll.
Mapbox/OpenStreetMap attribution remains visible in both modes.

The dashboard retains its existing Leaflet map. Backend schemas, risk calculation,
authentication, report mutations, notification preferences and other assets are
unchanged. Source references: Mapbox GL JS map API, Standard migration guide and
official 3D-building example at https://docs.mapbox.com/mapbox-gl-js/.

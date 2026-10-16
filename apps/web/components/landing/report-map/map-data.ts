import type { FeatureCollection, Point } from "geojson";
import type { SapAreaFeature, SapAreas } from "../../../lib/api/client";
import { MALANG_CENTER } from "../../../lib/malang";

export const HOME_CAMERA = {
  center: [MALANG_CENTER.longitude, MALANG_CENTER.latitude] as [number, number],
  zoom: 13.3, pitch: 48, bearing: -18,
};
export const INITIAL_BOUNDS = "112.570000,-8.040000,112.700000,-7.910000";
export const RISK_COLORS = { low: "#16a377", medium: "#efa82e", high: "#e66570" };
export const AREA_SOURCE = "vergo-verified-areas";
export const CENTER_SOURCE = "vergo-area-centers";
export const AREA_FILL = "vergo-area-fill";
export const AREA_LINE = "vergo-area-line";
export const COUNT_CIRCLES = "vergo-count-circles";
export const COUNT_LABELS = "vergo-count-labels";

/** Center of an aggregate grid cell, never an individual report coordinate. */
export function areaCenter(feature: SapAreaFeature): [number, number] {
  const ring = feature.geometry.coordinates[0];
  const points = ring.length > 1 ? ring.slice(0, -1) : ring;
  return points.reduce<[number, number]>((sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length], [0, 0]);
}

export function polygonData(areas: SapAreas | null): FeatureCollection {
  return { type: "FeatureCollection", features: (areas?.features ?? []).map(feature => ({ ...feature, id: feature.properties.cellId })) };
}

export function centerData(areas: SapAreas | null): FeatureCollection<Point> {
  return { type: "FeatureCollection", features: (areas?.features ?? []).map(feature => ({
    type: "Feature", id: feature.properties.cellId,
    geometry: { type: "Point", coordinates: areaCenter(feature) }, properties: feature.properties,
  })) };
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, GeoJSONSource, ExpressionSpecification } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { SapAreaFeature, SapAreas } from "../../../lib/api/client";
import { useI18n } from "../../../lib/i18n/provider";
import { AREA_FILL, AREA_LINE, AREA_SOURCE, CENTER_SOURCE, COUNT_CIRCLES, COUNT_LABELS, HOME_CAMERA, RISK_COLORS, areaCenter, centerData, polygonData } from "./map-data";
import s from "./report-map.module.css";

type Props = {
  areas: SapAreas | null; selected: SapAreaFeature | null; selectionRevision: number; mode: "2d" | "3d"; reset: number;
  onBoundsChange: (bbox: string) => void; onSelect: (cellId: string) => void;
  onReady: () => void; onUnavailable: () => void;
};

export default function MapboxCanvas(props: Props) {
  const { t } = useI18n();
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    let current: MapboxMap | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let failed = false;
    let loaded = false;
    const fail = () => {
      if (abort.signal.aborted || failed) return;
      failed = true;
      clearTimeout(timer);
      latest.current.onUnavailable();
    };
    void (async () => {
      try {
        timer = setTimeout(fail, 25_000);
        const response = await fetch("/api/map-config", { signal: abort.signal, cache: "no-store" });
        if (!response.ok) return fail();
        const config: { publicToken?: string } = await response.json();
        if (!config.publicToken?.startsWith("pk.")) return fail();
        const { default: mb } = await import("mapbox-gl");
        if (abort.signal.aborted || !node.current || failed) return;
        if (!mb.supported()) return fail();
        current = new mb.Map({
          container: node.current, accessToken: config.publicToken,
          style: "mapbox://styles/mapbox/standard",
          config: { basemap: { lightPreset: "day", showPointOfInterestLabels: false, showTransitLabels: false } },
          ...HOME_CAMERA, cooperativeGestures: true, antialias: true,
          minZoom: 10.5, maxZoom: 18, maxPitch: 65,
          attributionControl: false, performanceMetricsCollection: false,
          locale: {
            "NavigationControl.ZoomIn": t("Perbesar peta"),
            "NavigationControl.ZoomOut": t("Perkecil peta"),
            "NavigationControl.ResetBearing": t("Atur arah utara"),
            "AttributionControl.ToggleAttribution": t("Tampilkan atribusi peta"),
            "ScrollZoomBlocker.CtrlMessage": t("Gunakan Ctrl + gulir untuk memperbesar peta"),
            "ScrollZoomBlocker.CmdMessage": t("Gunakan ⌘ + gulir untuk memperbesar peta"),
            "TouchPanBlocker.Message": t("Gunakan dua jari untuk menggeser peta"),
          },
        });
        map.current = current;
        current.addControl(new mb.NavigationControl({ visualizePitch: true }), "top-right");
        current.addControl(new mb.AttributionControl({ compact: true }), "bottom-right");
        current.addControl(new mb.ScaleControl({ maxWidth: 90, unit: "metric" }), "bottom-left");
        current.on("error", event => {
          // Do not log Mapbox errors: request URLs may contain the public token.
          const status = (event.error as Error & { status?: number }).status ?? 0;
          // A single missing vector tile can recover; authorization/style failures cannot.
          if ([401, 403].includes(status) || (!loaded && !("sourceId" in event) && !("tile" in event))) fail();
        });
        current.on("webglcontextlost", fail);
        const publishBounds = () => {
          if (!current || abort.signal.aborted || failed) return;
          const b = current.getBounds();
          if (b) latest.current.onBoundsChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(n => n.toFixed(6)).join(","));
          if (node.current) node.current.dataset.pitch = current.getPitch().toFixed(1);
        };
        current.on("moveend", publishBounds);
        current.on("movestart", () => { if (node.current) node.current.dataset.mapIdle = "false"; });
        current.on("idle", () => { if (node.current) node.current.dataset.mapIdle = "true"; });
        current.on("load", () => {
          if (!current || abort.signal.aborted || failed) return;
          loaded = true;
          clearTimeout(timer);
          const color: ExpressionSpecification = ["match", ["get", "riskLevel"], "high", RISK_COLORS.high, "medium", RISK_COLORS.medium, RISK_COLORS.low];
          current.addSource(AREA_SOURCE, { type: "geojson", data: polygonData(latest.current.areas) });
          current.addSource(CENTER_SOURCE, { type: "geojson", data: centerData(latest.current.areas) });
          current.addLayer({ id: AREA_FILL, type: "fill", source: AREA_SOURCE, slot: "middle", paint: { "fill-color": color, "fill-opacity": 0.27 } });
          current.addLayer({ id: AREA_LINE, type: "line", source: AREA_SOURCE, slot: "top", paint: { "line-color": color, "line-width": 2, "line-opacity": 0.95 } });
          current.addLayer({ id: COUNT_CIRCLES, type: "circle", source: CENTER_SOURCE, slot: "top", paint: { "circle-color": color, "circle-radius": 17, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });
          current.addLayer({ id: COUNT_LABELS, type: "symbol", source: CENTER_SOURCE, slot: "top", layout: {
            "text-field": ["to-string", ["get", "incidentCount"]], "text-size": 13,
            "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"], "text-allow-overlap": true,
          }, paint: { "text-color": "#ffffff" } });
          for (const layer of [AREA_FILL, COUNT_CIRCLES]) {
            current.on("click", layer, event => {
              const cellId = event.features?.[0]?.properties?.cellId;
              if (typeof cellId === "string") latest.current.onSelect(cellId);
            });
            current.on("mouseenter", layer, () => { if (current) current.getCanvas().style.cursor = "pointer"; });
            current.on("mouseleave", layer, () => { if (current) current.getCanvas().style.cursor = ""; });
          }
          setReady(true);
          latest.current.onReady();
          publishBounds();
        });
      } catch { fail(); }
    })();
    const resize = new ResizeObserver(() => current?.resize());
    if (node.current) resize.observe(node.current);
    return () => { abort.abort(); clearTimeout(timer); resize.disconnect(); current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    (map.current.getSource(AREA_SOURCE) as GeoJSONSource)?.setData(polygonData(props.areas));
    (map.current.getSource(CENTER_SOURCE) as GeoJSONSource)?.setData(centerData(props.areas));
  }, [props.areas, ready]);

  useEffect(() => {
    const current = map.current;
    if (!current || !ready) return;
    const id = props.selected?.properties.cellId ?? "";
    current.setPaintProperty(AREA_LINE, "line-width", ["case", ["==", ["get", "cellId"], id], 4, 2]);
    current.setPaintProperty(AREA_FILL, "fill-opacity", ["case", ["==", ["get", "cellId"], id], 0.42, 0.27]);
    if (props.selected) current.easeTo({ center: areaCenter(props.selected), zoom: Math.max(15.8, current.getZoom()), duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650 });
  }, [props.selected?.properties.cellId, props.selectionRevision, ready]);

  useEffect(() => {
    if (!map.current || !ready) return;
    const threeD = props.mode === "3d";
    map.current.setConfigProperty("basemap", "show3dObjects", threeD);
    map.current.easeTo({ pitch: threeD ? HOME_CAMERA.pitch : 0, bearing: threeD ? HOME_CAMERA.bearing : 0,
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650 });
  }, [props.mode, ready]);

  useEffect(() => {
    if (!map.current || !ready || !props.reset) return;
    map.current.easeTo({ ...HOME_CAMERA, pitch: latest.current.mode === "3d" ? HOME_CAMERA.pitch : 0,
      bearing: latest.current.mode === "3d" ? HOME_CAMERA.bearing : 0, duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650 });
  }, [props.reset, ready]);

  return <div ref={node} className={s.canvas} data-map-ready={ready} data-map-engine="mapbox" role="region"
    aria-label={t("Peta area interaktif; geser atau perbesar untuk melihat laporan terverifikasi")} />;
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Box, Compass, Layers, LocateFixed, MapPin, RefreshCw, X } from "lucide-react";
import type { SapAreaFeature, SapAreas } from "../../../lib/api/client";
import { useI18n } from "../../../lib/i18n/provider";
import s from "./report-map.module.css";

const Canvas = dynamic(() => import("./mapbox-canvas"), { ssr: false });
const Fallback = dynamic(() => import("../../area-map"), { ssr: false });

type Props = {
  areas: SapAreas | null; selected: SapAreaFeature | null; selectedLabel: string; selectionRevision: number;
  onBoundsChange: (bbox: string) => void; onSelect: (cellId: string) => void;
};

export default function MapViewport(props: Props) {
  const { t } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<"2d" | "3d">("3d");
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reset, setReset] = useState(0);
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setActive(true); observer.disconnect(); }
    }, { rootMargin: "250px" });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={root} className={s.viewport} data-map-mode={fallback ? "fallback" : mode}>
    {active && (fallback
      ? <Fallback areas={props.areas} onBoundsChange={props.onBoundsChange} onSelect={props.onSelect} />
      : <Canvas key={attempt} {...props} mode={mode} reset={reset} onReady={() => setReady(true)} onUnavailable={() => { setFallback(true); setReady(false); }} />)}
    {!ready && !fallback && <div className={s.mapLoading} role="status"><Compass size={26} /><span>{t(active ? "Menyiapkan peta 3D…" : "Jelajahi peta interaktif")}</span></div>}
    <div className={s.toolbar}>
      <span className={s.location}><MapPin size={16} aria-hidden="true" /> Malang, {t("Jawa Timur")}</span>
      <div className={s.modes} role="group" aria-label={t("Tampilan peta")}>
        <button type="button" aria-pressed={fallback || mode === "2d"} disabled={fallback || !ready} onClick={() => setMode("2d")}><Layers size={16} aria-hidden="true" />2D</button>
        <button type="button" aria-pressed={!fallback && mode === "3d"} disabled={fallback || !ready} onClick={() => setMode("3d")}><Box size={16} aria-hidden="true" />3D</button>
      </div>
    </div>
    {ready && <button type="button" className={s.reset} onClick={() => { props.onSelect(""); setReset(value => value + 1); }} aria-label={t("Kembali ke Malang")} title={t("Kembali ke Malang")}><LocateFixed size={20} /></button>}
    {fallback && <div className={s.fallback} role="status"><span>{t("Peta 3D belum tersedia. Peta 2D tetap dapat digunakan.")}</span><button type="button" onClick={() => { setFallback(false); setAttempt(value => value + 1); }}><RefreshCw size={15} />{t("Coba 3D lagi")}</button></div>}
    {props.selected && !fallback && ready && <div className={s.selection} aria-live="polite">
      <div><MapPin size={19} aria-hidden="true" /><strong>{props.selectedLabel}</strong><button type="button" onClick={() => props.onSelect("")} aria-label={t("Tutup detail area")}><X size={17} /></button></div>
      <p>{t("{0} kejadian unik terverifikasi", { "0": props.selected.properties.incidentCount })}</p>
      <small>{t("{0} terbuka · {1} selesai (historis)", { "0": props.selected.properties.openIncidentCount, "1": props.selected.properties.resolvedIncidentCount })}</small>
    </div>}
    <p className={s.gesture}>{t("Geser untuk menjelajah · gunakan dua jari di layar sentuh")}{!fallback && mode === "3d" && <span> · {t("Pilih area untuk melihat bangunan 3D")}</span>}</p>
  </div>;
}

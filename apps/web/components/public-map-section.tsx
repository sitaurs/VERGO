"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, Info, MapPin, RefreshCw, Search, ShieldCheck } from "lucide-react";
import AreaIncidentLinks from "./community/area-incident-links";
import { publicAreaLabel } from "./community/public-community";
import { ApiError, apiGet, getArea, listAreas, type SapAreaDetail, type SapAreas } from "../lib/api/client";
import { useI18n } from "../lib/i18n/provider";
import MapViewport from "./landing/report-map/map-viewport";
import { INITIAL_BOUNDS } from "./landing/report-map/map-data";
import s from "./landing/report-map/report-map.module.css";

type Locality = { cellId: string; label: string };

export default function PublicMapSection() {
  const { t, intlLocale } = useI18n();
  const [bbox, setBbox] = useState(INITIAL_BOUNDS);
  const [period, setPeriod] = useState(30);
  const [areas, setAreas] = useState<SapAreas | null>(null);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<SapAreaDetail | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [localities, setLocalities] = useState<Record<string, string>>({});
  const range = useMemo(() => {
    const to = new Date();
    return { from: new Date(to.getTime() - period * 86_400_000).toISOString(), to: to.toISOString() };
  }, [period, reload]);
  const onBoundsChange = useCallback((value: string) => setBbox(value), []);
  const onSelect = useCallback((value: string) => { setSelected(value); setDetail(null); setDetailError(false); setSelectionRevision(previous => previous + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      void listAreas(bbox, range.from, range.to, undefined, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        setAreas(result); setError(""); setLoading(false);
      }).catch(cause => {
        if (controller.signal.aborted) return;
        setAreas(null); setDetail(null); setSelected(""); setLoading(false);
        setError(cause instanceof ApiError && cause.code === "MAP_BOUNDS_TOO_LARGE"
          ? "Area terlalu luas. Perbesar peta untuk melihat ringkasan." : "Ringkasan area belum dapat dimuat. Silakan coba lagi.");
      });
    }, 300);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [bbox, range]);

  const cells = useMemo(() => areas?.features.map(feature => feature.properties.cellId) ?? [], [areas]);
  useEffect(() => {
    const controller = new AbortController();
    setLocalities({});
    // The existing public endpoint accepts at most 100 cells per batch.
    void (async () => {
      for (let offset = 0; offset < cells.length && !controller.signal.aborted; offset += 100) {
        try {
          const result = await apiGet<{ items: Locality[] }>(`/area-localities?cells=${encodeURIComponent(cells.slice(offset, offset + 100).join(","))}`, controller.signal);
          if (!controller.signal.aborted) setLocalities(previous => ({ ...previous, ...Object.fromEntries(result.items.map(item => [item.cellId, item.label])) }));
        } catch { /* A grid area remains usable without a configured locality name. */ }
      }
    })();
    return () => controller.abort();
  }, [cells]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    void getArea(selected, range.from, range.to, undefined, controller.signal).then(result => {
      if (!controller.signal.aborted) { setDetail(result); setDetailError(false); }
    }).catch(() => { if (!controller.signal.aborted) { setDetail(null); setDetailError(true); } });
    return () => controller.abort();
  }, [selected, range, selectionRevision]);

  const label = (cellId: string) => publicAreaLabel({ cellId, label: localities[cellId] ?? "" }, t);
  const features = areas?.features ?? [];
  const visible = features.filter(feature => `${label(feature.properties.cellId)} ${feature.properties.cellId}`.toLocaleLowerCase(intlLocale).includes(query.trim().toLocaleLowerCase(intlLocale)));
  const selectedFeature = selected ? features.find(feature => feature.properties.cellId === selected) ?? detail?.feature ?? null : null;
  const levels = { low: t("Kejadian rendah"), medium: t("Kejadian sedang"), high: t("Kejadian tinggi") };
  const totals = features.reduce((sum, { properties }) => ({
    incidents: sum.incidents + properties.incidentCount,
    open: sum.open + properties.openIncidentCount,
    resolved: sum.resolved + properties.resolvedIncidentCount,
  }), { incidents: 0, open: 0, resolved: 0 });

  return <section id="peta" className={s.section} aria-labelledby="public-report-map-title">
    <div data-landing-enter="heading" className={s.heading}>
      <p className={s.eyebrow}><span />{t("Pantau lingkungan")}</p>
      <h2 id="public-report-map-title">{t("Peta laporan sampah")}</h2>
      <p>{t("Jelajahi kejadian sampah yang telah ditinjau moderator. Periksa periode dan waktu pembaruan untuk memahami kondisi yang dilaporkan.")}</p>
    </div>
    <div className={s.frame}>
      <MapViewport areas={areas} selected={selectedFeature} selectedLabel={label(selected)} selectionRevision={selectionRevision} onBoundsChange={onBoundsChange} onSelect={onSelect} />
      <aside className={s.panel} aria-label={t("Ringkasan area")}>
        <div className={s.panelHeading}><div><h3>{t("Ringkasan area")}</h3><p><ShieldCheck size={15} aria-hidden="true" />{t("Terverifikasi moderator")}</p></div><button type="button" onClick={() => setReload(value => value + 1)} aria-label={t("Muat ulang ringkasan area")} title={t("Muat ulang ringkasan area")} disabled={loading}><RefreshCw size={18} aria-hidden="true" /></button></div>
        <small className={s.updated}>{loading ? t("Memuat data area") : areas ? t("Diperbarui: {0}", { "0": new Date(areas.asOf).toLocaleString(intlLocale, { dateStyle: "short", timeStyle: "short" }) }) : t("Data belum tersedia")}{areas?.isStale && !loading ? ` · ${t("Data terakhir tersimpan")}` : ""}</small>
        <label className={s.period}><span>{t("Periode")}</span><span><CalendarDays size={18} aria-hidden="true" /><select value={period} onChange={event => { setPeriod(Number(event.target.value)); onSelect(""); }} aria-label={t("Periode laporan")}><option value={7}>{t("7 hari terakhir")}</option><option value={30}>{t("30 hari terakhir")}</option><option value={90}>{t("90 hari terakhir")}</option></select><ChevronDown size={16} aria-hidden="true" /></span></label>
        {!loading && areas && <div className={s.summary} aria-label={t("Kejadian unik pada area peta")}>
          <p>{t("{0} kejadian unik pada area peta", { "0": totals.incidents })}</p>
          <span>{t("{0} terbuka · {1} selesai (historis)", { "0": totals.open, "1": totals.resolved })}</span>
          <small>{new Date(areas.from).toLocaleDateString(intlLocale)} – {new Date(areas.to).toLocaleDateString(intlLocale)}</small>
        </div>}
        {areas?.isStale && !loading && <p className={s.stale} role="status">{t("Ringkasan tersimpan ditampilkan. Kondisi terbaru belum dapat dipastikan; coba muat ulang.")}</p>}
        <p className={s.legendTitle}>{t("Tingkat kejadian berdasarkan laporan")}</p>
        <div className={s.legend} aria-label={t("Legenda tingkat kejadian berdasarkan laporan")}>{(["low", "medium", "high"] as const).map(risk => <span key={risk}><i data-risk={risk} />{t({ low: "Rendah", medium: "Sedang", high: "Tinggi" }[risk])}</span>)}<span><i />{t("Belum ada data")}</span></div>
        <div className={s.listTitle}><h4>{t("Area dengan laporan")}</h4><span>{loading || !areas ? "—" : t("{0} area", { "0": features.length })}</span></div>
        <label className={s.search}><Search size={17} aria-hidden="true" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Cari nama atau ID area")} aria-label={t("Cari nama atau ID area")} /></label>
        <div className={s.reports} aria-busy={loading} aria-live="polite">
          {loading ? <p className={s.state}>{t("Memuat ringkasan laporan terverifikasi…")}</p> : error ? <div className={s.error}><p role="alert">{t(error)}</p><button type="button" onClick={() => setReload(value => value + 1)}><RefreshCw size={16} />{t("Coba lagi")}</button></div> : visible.length ? visible.map(feature => {
            const p = feature.properties;
            return <button className={s.report} data-selected={selected === p.cellId} aria-pressed={selected === p.cellId} type="button" key={p.cellId} onClick={() => onSelect(p.cellId)}>
              <span className={s.pin}><MapPin size={20} aria-hidden="true" /></span><span className={s.reportMain}><strong>{label(p.cellId)}</strong><small className={s.cellId}>{p.cellId}</small><span>{t("{0} kejadian unik terverifikasi", { "0": p.incidentCount })}</span><small>{t("{0} terbuka · {1} selesai (historis)", { "0": p.openIncidentCount, "1": p.resolvedIncidentCount })}</small></span>
              <span className={s.risk} data-risk={p.riskLevel}>{levels[p.riskLevel]}</span><ChevronRight size={16} aria-hidden="true" />
            </button>;
          }) : <p className={s.state}>{t(query.trim() ? "Tidak ada area yang cocok. Coba nama atau ID lain." : "Belum ada laporan terverifikasi pada periode ini. Ini bukan bukti area bersih.")}</p>}
        </div>
        {selected && <div className={s.detail}>
          <p><MapPin size={16} aria-hidden="true" /><strong>{label(selected)}</strong></p>
          {detailError ? <p role="status">{t("Detail area belum dapat dimuat. Pilih area lagi untuk mencoba.")}</p> : detail ? <small>{t("{0} kejadian unik pada {1} hari berbeda.", { "0": detail.feature.properties.incidentCount, "1": detail.feature.properties.distinctDays })}</small> : <small>{t("Memuat detail area…")}</small>}
          <AreaIncidentLinks key={`${selected}-${range.from}`} cellId={selected} from={range.from} to={range.to} />
        </div>}
        <p className={s.disclaimer}><Info size={16} aria-hidden="true" />{t("Ringkasan area, bukan lokasi persis pelapor.")}</p>
        <details className={s.method}><summary>{t("Cara membaca dan metode peta")}</summary>
          <p>{t("Bukti dan konteks laporan telah diperiksa. Kondisi dapat berubah; lihat waktu pembaruan.")}</p>
          <p>{t("Hitungan memakai kejadian unik yang ditinjau moderator, bukan jumlah dukungan atau scan. Laporan duplikat tidak dihitung lagi. Kejadian selesai tetap masuk riwayat pada periode pengamatan; hanya kejadian terverifikasi dan dalam penanganan dihitung terbuka.")}</p>
          <p>{t("Warna merangkum jumlah kejadian dan hari pengamatan, bukan risiko penyakit atau kepastian bahaya. Lebih banyak warga yang melapor juga dapat meningkatkan hitungan.")}</p>
          <p>{t("Rendah: 1–2 kejadian atau semua kejadian pada satu hari. Sedang: 3–4 kejadian pada sedikitnya 2 hari. Tinggi: sedikitnya 5 kejadian pada sedikitnya 2 hari.")}</p>
          <p>{t("Periode mengikuti waktu kejadian. Hari pengamatan dihitung dalam zona waktu Asia/Jakarta; ringkasan dihitung per sel area, termasuk bagian sel di luar batas layar.")}</p>
          {areas && <small>{t("Versi metode: {0}", { "0": areas.methodVersion })}</small>}
        </details>
      </aside>
    </div>
    <p className={s.footnote}><Info size={17} aria-hidden="true" />{t("Area tanpa laporan terverifikasi bukan bukti area bersih. Warna peta merangkum laporan, bukan risiko penyakit.")}</p>
  </section>;
}

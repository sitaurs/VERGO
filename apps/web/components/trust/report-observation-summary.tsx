"use client";

import type { SapReport } from "../../lib/api/client";
import { useI18n } from "../../lib/i18n/provider";
import s from "./trust-panels.module.css";

const sourceLabels = { firsthand: "Saya melihatnya langsung", secondhand: "Informasi dari orang lain" } as const;
const contextLabels = { burning: "Terlihat pembakaran", near_waterway: "Dekat saluran air", sharp_objects: "Terlihat benda tajam" } as const;

export default function ReportObservationSummary({ report }: { report: SapReport }) {
  const { t } = useI18n();
  const source = report.observationSource;
  if (!source && !report.inference && !report.sourceReference && !report.contextFlags.length && !report.photoUnavailableReason) return null;
  return <section className={s.card} aria-labelledby="observation-summary-title">
    <h3 id="observation-summary-title">{t("Konteks pengamatan (privat)")}</h3>
    <p className={s.muted}>{t("Bagian ini hanya untuk pelapor dan moderator; tidak ikut tampil pada halaman publik.")}</p>
    {source && <p><strong>{t("Sumber informasi")}: </strong>{t(sourceLabels[source])}</p>}
    {report.sourceReference && <p><strong>{t("Rujukan kabar")}: </strong>{report.sourceReference}</p>}
    {report.inference && <p><strong>{t("Dugaan pelapor (belum diperiksa)")}: </strong>{report.inference}</p>}
    {report.contextFlags.length > 0 && <p><strong>{t("Konteks yang dilaporkan")}: </strong>{report.contextFlags.map(flag => t(contextLabels[flag])).join(", ")}</p>}
    {report.photoUnavailableReason === "unsafe" && <p className={s.notice}>{t("Foto belum tersedia karena pelapor menyatakan pengambilan foto tidak aman. Minta bukti tambahan sebelum verifikasi.")}</p>}
  </section>;
}

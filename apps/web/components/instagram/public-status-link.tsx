"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { useI18n } from "../../lib/i18n/provider";
import type { InstagramPost, PublicationSource } from "./types";
import { POSTER_TEMPLATE_VERSION } from "./types";
import { Notice } from "./publication-ui";
import ui from "./post-detail.module.css";

export default function PublicStatusLink({ source, record }: { source: PublicationSource; record: InstagramPost | null }) {
  const { t } = useI18n();
  const [qr, setQr] = useState("");
  const [feedback, setFeedback] = useState("");
  const url = source.publicUrl;
  const syntheticQa = record?.actions.publish.reasonCode === "SYNTHETIC_QA_SOURCE";
  useEffect(() => {
    let active = true;
    setQr("");
    setFeedback("");
    if (url && !syntheticQa) void import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(url, {
      width: 200, margin: 4, errorCorrectionLevel: "M", color: { dark: "#122d4d", light: "#ffffff" },
    })).then(value => { if (active) setQr(value); }).catch(() => { /* The readable link remains usable. */ });
    return () => { active = false; };
  }, [url, syntheticQa]);
  if (syntheticQa) return <Notice warning>
    <strong>{t("Data uji QA · bukan kejadian nyata")}</strong>
    <p>{t("Laporan ini hanya tersedia untuk pengujian internal. Halaman status publik dan QR tidak tersedia; draf tidak dapat disetujui atau diposting ke Instagram.")}</p>
    <p>{t("Gunakan Buka moderasi laporan untuk memeriksa data uji. Label QA harus tetap dipertahankan.")}</p>
  </Notice>;
  if (!url) return null;
  return <div className={ui.publicStatus}>
    <strong>{t("Halaman status publik VERGO")}</strong>
    <p>{t("Tanggal pada unggahan adalah waktu pengamatan. Kondisi dan koreksi terbaru tersedia di halaman ini tanpa login.")}</p>
    <a href={url} target="_blank" rel="noopener noreferrer">{url}<ExternalLink size={15} aria-hidden="true" /></a>
    <button type="button" className={ui.outline} onClick={async () => {
      try { await navigator.clipboard.writeText(url); setFeedback(t("Tautan berhasil disalin.")); }
      catch { setFeedback(t("Tautan belum dapat disalin otomatis. Pilih dan salin URL di atas.")); }
    }}><Copy size={16} />{t("Salin tautan status")}</button>
    {qr && <img src={qr} alt={t("Kode QR untuk membuka status terbaru laporan VERGO")} width={200} height={200} />}
    {feedback && <p role="status">{feedback}</p>}
    <p>{t("Gunakan tautan ini pada penempatan yang didukung akun Instagram. URL dalam caption Feed belum tentu dapat diklik.")}</p>
    <p>{t("Laporan terverifikasi tidak otomatis diposting. Izin foto, pratinjau final, persetujuan admin dan perintah publikasi tetap diperlukan.")}</p>
    {record && ["draft", "failed"].includes(record.status) && record.rendition.templateVersion !== POSTER_TEMPLATE_VERSION && <Notice warning>{t("Draf ini memakai format atau branding lama. Simpan ulang untuk membuat caption dan gambar VERGO baru; persetujuan lama tidak berlaku sampai pratinjau baru diperiksa.")}</Notice>}
    {record?.publishedAt && record.rendition.templateVersion !== POSTER_TEMPLATE_VERSION && <Notice warning>{t("Unggahan ini memakai format lama. Periksa penempatan tautan status dan kebutuhan unggahan lanjutan; perubahan format VERGO tidak otomatis mengubah unggahan Instagram yang sudah terbit.")}</Notice>}
    {record?.sourceUpdate?.reason && <Notice warning>
      <strong>{t(record.sourceUpdate.followUpRequired ? "Unggahan ini perlu tindak lanjut" : "Sumber perlu ditinjau ulang")}</strong>
      <p>{t(record.sourceUpdate.changed ? "Laporan sumber sudah berubah sejak versi unggahan ini. Tinjau status dan koreksi terbaru sebelum memakai kembali materi." : "Izin foto, bukti atau kelayakan sumber tidak lagi memenuhi syarat publikasi.")}</p>
      {record.sourceUpdate.followUpRequired && <p>{t("Perubahan di VERGO tidak otomatis mengubah unggahan Instagram lama. Admin perlu meninjau unggahan, lalu menentukan pembaruan lanjutan atau penarikan melalui alur yang tersedia.")}</p>}
      <small>{t("Revisi sumber unggahan")}: {source.sourceRevision} · {t("Revisi saat ini")}: {record.sourceUpdate.currentSourceRevision}</small>
    </Notice>}
  </div>;
}

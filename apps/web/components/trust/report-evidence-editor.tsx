"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, getReport, updateReport, uploadMedia, type SapReport } from "../../lib/api/client";
import { r1Error } from "../../lib/api/r1";
import { useI18n } from "../../lib/i18n/provider";
import s from "./trust-panels.module.css";

function Preview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return url ? <img src={url} alt={file.name} width={120} height={90} style={{ objectFit: "cover", borderRadius: 8 }} /> : null;
}

export default function ReportEvidenceEditor({ report, onSaved }: { report: SapReport; onSaved: (report: SapReport) => void }) {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const uploaded = useRef(new Map<File, string>());

  function choose(list: FileList | null) {
    const next = Array.from(list ?? []);
    if (report.mediaIds.length + next.length > 3) { setError("Maksimal 3 foto untuk satu laporan."); return; }
    if (next.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setError("Foto harus JPG, PNG, atau WebP dan maksimal 10 MB."); return;
    }
    setError(""); setMessage(""); setFiles(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !files.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const newIds: string[] = [];
      for (const file of files) {
        let id = uploaded.current.get(file);
        if (!id) { id = (await uploadMedia(file, "report")).id; uploaded.current.set(file, id); }
        newIds.push(id);
      }
      const value = await updateReport(report.id, report.revision, { mediaIds: [...report.mediaIds, ...newIds], photoUnavailableReason: null });
      setFiles([]); uploaded.current.clear(); setMessage("Foto tersimpan sebagai bukti privat untuk ditinjau moderator."); onSaved(value);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        try { onSaved(await getReport(report.id)); setError("Laporan berubah. Data terbaru dimuat; periksa sebelum mengirim foto lagi."); }
        catch { setError("Laporan berubah. Muat ulang detail sebelum mencoba lagi."); }
      } else setError(r1Error(cause));
    } finally { setBusy(false); }
  }

  if (report.mediaIds.length >= 3) return report.photoUnavailableReason ? <p className={s.notice}>{t("Bukti foto sudah lengkap; alasan foto tidak tersedia akan diperbarui setelah perubahan tersimpan.")}</p> : null;
  return <section className={s.card} aria-labelledby="complete-report-evidence-title">
    <h3 id="complete-report-evidence-title">{t("Lengkapi foto bukti")}</h3>
    <p className={s.muted}>{t("Foto akan dipratinjau di sini dan tetap privat sampai moderator meninjaunya. Hindari wajah, plat nomor, dan mendekati lokasi berbahaya.")}</p>
    {report.photoUnavailableReason === "unsafe" && <p className={s.notice}>{t("Foto belum tersedia karena pengambilannya dinilai tidak aman. Anda dapat menambahkannya jika sudah ada bukti yang aman.")}</p>}
    <form className={s.form} onSubmit={submit}>
      <label className={s.field}>{t("Pilih foto bukti (opsional)")}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={event => { choose(event.target.files); event.target.value = ""; }} /></label>
      {files.length > 0 && <div className={s.evidence}>{files.map((file, index) => <figure key={`${file.name}-${file.lastModified}-${index}`}><Preview file={file}/><figcaption className={s.muted}>{file.name}</figcaption></figure>)}</div>}
      {error && <p className={s.error} role="alert">{t(error)}</p>}{message && <p className={s.notice} role="status">{t(message)}</p>}
      <button className={s.button} type="submit" disabled={busy || !files.length}>{t(busy ? "Menyimpan bukti…" : "Simpan bukti privat")}</button>
    </form>
  </section>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronRight, Clock3, Copy, ExternalLink, FilePlus2, FileText, Info, LockKeyhole, RotateCw, Save, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import {
  decideCommunityUpdate,
  getAdminCommunityUpdate,
  getCommunityUpdatePhotoUrl,
  getHermesReview,
  listCommunityReviewQueue,
  listEvidenceRenditions,
  requestEvidenceRendition,
  requestHermesReview,
  type AdminCommunityUpdate,
  type CommunityUpdateDecisionInput,
  type ReviewQueueItem,
} from "../../lib/api/community";
import styles from "./community-admin.module.css";
import CommunityReviewEvidence, { type MediaReview } from "./community-review-evidence";

const kindLabels = {
  still_present: "Masih terlihat",
  reduced: "Sudah berkurang",
  looks_clean: "Terlihat bersih",
  information_wrong: "Informasi kurang tepat",
} as const;

const recommendationLabels = {
  recommend_accept: "Saran: pertimbangkan untuk menerima",
  human_review: "Saran: perlu tinjauan manusia",
  recommend_reject: "Saran: pertimbangkan untuk menolak",
  recommend_duplicate: "Saran: periksa kemungkinan duplikasi",
} as const;

const reasonLabels: Record<string, string> = {
  EVIDENCE_CONFLICT: "Bukti belum selaras",
  IMAGE_UNCLEAR: "Foto perlu diperjelas",
  MORE_EVIDENCE_REQUIRED: "Bukti tambahan diperlukan",
  LOCATION_UNCONFIRMED: "Lokasi belum dikonfirmasi",
  TIME_UNCONFIRMED: "Waktu belum dikonfirmasi",
};

const decisionOptions = [
  { value: "approve", label: "Setujui sebagai pembaruan publik", hint: "Pembaruan sudah diperiksa dan siap dipublikasikan.", icon: Check },
  { value: "request_evidence", label: "Minta bukti tambahan", hint: "Minta informasi atau bukti tambahan dari warga.", icon: FilePlus2 },
  { value: "reject", label: "Tolak pembaruan", hint: "Pembaruan tidak valid atau tidak relevan.", icon: X },
] as const;

type ModeratorDraft = { revision: number; action: "approve" | "request_evidence" | "reject"; reason: string; summary: string; requestedEvidence: string };

export default function AdminCommunityReview() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [queueSearch, setQueueSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [update, setUpdate] = useState<AdminCommunityUpdate | null>(null);
  const [media, setMedia] = useState<MediaReview[]>([]);
  const [renditionChoice, setRenditionChoice] = useState<Record<string, string>>({});
  const [channels, setChannels] = useState<Record<string, { web: boolean; instagram: boolean }>>({});
  const [action, setAction] = useState<"approve" | "request_evidence" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [summary, setSummary] = useState("");
  const [requestedEvidence, setRequestedEvidence] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [renderBusy, setRenderBusy] = useState("");
  const [error, setError] = useState("");
  const [queueError, setQueueError] = useState("");
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);
  // Drafts stay in this mounted review page; private moderator notes are not persisted in browser storage.
  const drafts = useRef<Record<string, ModeratorDraft>>({});
  const loadedForm = useRef("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setQueueError("");
    void listCommunityReviewQueue(undefined, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setQueue(page.items);
        setCursor(page.nextCursor);
        setSelectedId((current) => current && page.items.some((item) => item.subjectId === current)
          ? current
          : page.items[0]?.subjectId ?? "");
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setQueueError(cause instanceof Error ? cause.message : "Antrean komunitas belum dapat dimuat.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    setQueue((current) => current.map((item) => {
      if (item.subjectId !== update?.id) return item;
      return { ...item, latestReview: update.latestReview };
    }));
  }, [update?.id, update?.latestReview]);

  useEffect(() => {
    if (!update || update.status === "submitted") return;
    setQueue((current) => current.filter((item) => item.subjectId !== update.id));
    setSelectedId((current) => current === update.id ? "" : current);
  }, [update?.id, update?.status]);

  useEffect(() => {
    if (!selectedId || !queue.length || queue.some((item) => item.subjectId === selectedId)) return;
    setSelectedId(queue[0]?.subjectId ?? "");
  }, [queue, selectedId]);

  useEffect(() => {
    if (!selectedId || !cursor) return;
    const timer = setInterval(() => setRefresh((value) => value + 1), 10000);
    return () => clearInterval(timer);
  }, [selectedId, cursor]);


  useEffect(() => {
    if (!selectedId) { setUpdate(null); setMedia([]); return; }
    const controller = new AbortController();
    setLoadingDetail(true);
    setError("");
    void getAdminCommunityUpdate(selectedId, controller.signal)
      .then(async (detail) => {
        if (controller.signal.aborted) return;
        const evidence = await Promise.all(detail.mediaIds.map(async (mediaId) => {
          const [photo, page] = await Promise.all([
            getCommunityUpdatePhotoUrl(detail.id, mediaId, controller.signal),
            listEvidenceRenditions(mediaId, detail.id, undefined, controller.signal),
          ]);
          return { mediaId, url: photo.url, renditions: page.items };
        }));
        if (controller.signal.aborted) return;
        setUpdate(detail);
        const formKey = `${detail.id}:${detail.revision}`;
        if (loadedForm.current !== formKey) {
          const saved = drafts.current[detail.id];
          const draft = saved?.revision === detail.revision ? saved : null;
          setAction(draft?.action ?? "approve");
          setReason(draft?.reason ?? "");
          setSummary(draft?.summary ?? detail.publicSummary ?? "");
          setRequestedEvidence(draft?.requestedEvidence ?? "");
          setChannels({});
          loadedForm.current = formKey;
        }
        if (!controller.signal.aborted) {
          setMedia(evidence);
          setRenditionChoice((old) => {
            const next = { ...old };
            for (const item of evidence) {
              if (!item.renditions.some((rendition) => rendition.id === next[item.mediaId]))
                next[item.mediaId] = item.renditions.find((rendition) => rendition.status === "ready")?.id ?? "";
            }
            return next;
          });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Detail pembaruan belum dapat dimuat.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingDetail(false); });
    return () => controller.abort();
  }, [selectedId, refresh]);

  const latestReview = update?.latestReview ?? null;
  const run = latestReview;
  useEffect(() => {
    if (!run || !["queued", "running"].includes(run.status)) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (controller.signal.aborted) return;
      try {
        const latest = await getHermesReview(run!.id, controller.signal);
        if (controller.signal.aborted) return;
        setUpdate((old) => old ? { ...old, latestReview: latest } : old);
        if (!["queued", "running"].includes(latest.status)) return;
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Status Hermes belum dapat diperbarui.");
        return;
      }
      timer = setTimeout(() => void poll(), 3000);
    }
    timer = setTimeout(() => void poll(), 2500);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [run?.id, run?.status]);

  useEffect(() => {
    if (!media.some((item) => item.renditions.some((rendition) => rendition.status === "queued"))) return;
    const timer = setTimeout(() => setRefresh((value) => value + 1), 3500);
    return () => clearTimeout(timer);
  }, [media]);

  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const page = await listCommunityReviewQueue(cursor);
      setQueue((old) => [...old, ...page.items.filter((item) => !old.some((previous) => previous.subjectId === item.subjectId))]);
      setCursor(page.nextCursor);
    } catch (cause) {
      setQueueError(cause instanceof Error ? cause.message : "Antrean berikutnya belum dapat dimuat.");
    } finally { setBusy(false); }
  }

  async function renderEvidence(mediaId: string) {
    if (!update || update.id !== selectedId || loadingDetail || renderBusy || busy) return;
    setRenderBusy(mediaId);
    setError("");
    try {
      await requestEvidenceRendition(update, mediaId, crypto.randomUUID());
      setMessage("Versi bukti privat sedang disiapkan untuk ditinjau.");
      setRefresh((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Versi bukti belum dapat dibuat.");
    } finally { setRenderBusy(""); }
  }

  async function requestReview() {
    if (!update || update.id !== selectedId || loadingDetail || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const review = await requestHermesReview(update.id, update.revision, crypto.randomUUID());
      setUpdate((old) => old ? { ...old, latestReview: review } : old);
      setMessage("Hermes menyiapkan rekomendasi. Keputusan tetap dilakukan moderator.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Permintaan Hermes belum dapat dibuat.");
    } finally { setBusy(false); }
  }

  async function decide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!update || update.id !== selectedId || loadingDetail || busy || update.status !== "submitted" || reason.trim().length < 5) return;
    const requested = requestedEvidence.split(/\n|,/).map((item) => item.trim()).filter(Boolean).slice(0, 3);
    if (action === "request_evidence" && requested.length === 0) { setError("Sebutkan bukti tambahan yang diminta."); return; }
    if (action === "approve" && !summary.trim()) { setError("Tulis ringkasan publik yang ditinjau moderator."); return; }
    const approvals: CommunityUpdateDecisionInput["publicEvidenceApprovals"] = action === "approve"
      ? media.flatMap((item) => {
          const rendition = item.renditions.find((candidate) => candidate.id === renditionChoice[item.mediaId] && candidate.status === "ready");
          const selectedChannels = [
            ...(channels[item.mediaId]?.web ? ["web" as const] : []),
            ...(channels[item.mediaId]?.instagram ? ["instagram" as const] : []),
          ];
          return rendition && selectedChannels.length ? [{ mediaId: item.mediaId, renditionId: rendition.id, channels: selectedChannels }] : [];
        })
      : [];
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await decideCommunityUpdate(update, {
        action,
        reason: reason.trim(),
        publicSummary: action === "approve" ? summary.trim() : null,
        publicEvidenceApprovals: approvals,
        requestedEvidence: action === "request_evidence" ? requested : [],
      }, crypto.randomUUID());
      delete drafts.current[update.id];
      setMessage(action === "approve" ? "Pembaruan disetujui moderator dan kronologi diperbarui." : action === "request_evidence" ? "Permintaan bukti tambahan dikirim ke pelapor." : "Pembaruan ditolak moderator.");
      setReason("");
      setRequestedEvidence("");
      setRefresh((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Keputusan belum tersimpan.");
    } finally { setBusy(false); }
  }

  function saveDraft() {
    if (!update || update.id !== selectedId || loadingDetail || busy || update.status !== "submitted") return;
    drafts.current[update.id] = { revision: update.revision, action, reason, summary, requestedEvidence };
    setMessage("Ringkasan dan catatan draf tersimpan selama halaman ini terbuka. Belum ada keputusan yang dikirim.");
  }

  return <section className={styles.page} aria-label="Moderasi pembaruan komunitas">
    <header data-motion="heading" className={styles.header}><div><p className={styles.eyebrow}>ADMIN · KOMUNITAS &amp; HERMES</p><h1>Tinjau pembaruan warga</h1><p>Periksa bukti warga dan rekomendasi Hermes sebelum menentukan keputusan.</p></div><div className={styles.headerActions}><Image className={styles.headerArt} src="/images/admin-workspaces/hermes.webp" alt="" width={160} height={120} aria-hidden="true" /><button type="button" className={styles.refresh} onClick={() => setRefresh((value) => value + 1)} disabled={loading || busy}><RotateCw size={16} aria-hidden="true" />Muat ulang</button></div></header>
    <ol className={styles.workflow} aria-label="Alur tinjauan"><li><span>1</span>Pilih pembaruan</li><li aria-current={selectedId ? "step" : undefined}><span>2</span>Periksa bukti</li><li><span>3</span>Tentukan keputusan</li></ol>
    <div className={styles.layout}>
      <aside className={styles.queue} aria-label="Antrean pembaruan">
        <h2>Antrean moderator <span>{queue.length}</span></h2>
        <label className={styles.queueSearch}><Search size={16} aria-hidden="true" /><input type="search" aria-label="Cari di antrean yang dimuat" placeholder="Cari ID atau pembaruan" value={queueSearch} onChange={event => setQueueSearch(event.target.value)} /></label>
        {loading && <p className={styles.helper}>Memuat antrean…</p>}
        {queueError && <p className={styles.error} role="alert">{queueError}</p>}
        {!loading && !queue.length && !queueError && <p className={styles.helper}>Tidak ada pembaruan warga yang menunggu.</p>}
        {queue.filter(item => `${item.title} ${item.reportId}`.toLocaleLowerCase("id-ID").includes(queueSearch.trim().toLocaleLowerCase("id-ID"))).map((item) => <button key={item.subjectId} type="button" className={`${styles.queueItem} ${selectedId === item.subjectId ? styles.selected : ""}`} aria-pressed={selectedId === item.subjectId} disabled={busy || !!renderBusy} onClick={() => { setSelectedId(item.subjectId); setMessage(""); }}>
          <strong>{item.title}</strong><span className={styles.queueStatus}>{item.reviewState === "needs_evidence" ? "Bukti tambahan diminta" : "Menunggu moderator"}</span><small>Laporan #{item.reportId.slice(0, 8)}</small><ChevronRight className={styles.queueArrow} size={17} aria-hidden="true" />
          {item.latestReview && <small>Hermes: {item.latestReview.status}</small>}
        </button>)}
        {queueSearch.trim() && !queue.some(item => `${item.title} ${item.reportId}`.toLocaleLowerCase("id-ID").includes(queueSearch.trim().toLocaleLowerCase("id-ID"))) && <p className={styles.helper}>Tidak ada hasil pada antrean yang dimuat.</p>}
        {!!queue.length && <p className={styles.queueHint}><Info size={16} aria-hidden="true" />Pilih pembaruan untuk memeriksa bukti dan tindak lanjut.</p>}
        {cursor && <button type="button" className={styles.loadMore} onClick={() => void loadMore()} disabled={busy}>Muat berikutnya</button>}
      </aside>
      <section className={styles.detail} aria-label="Detail tinjauan" aria-busy={loadingDetail}>
        {loadingDetail && <p className={styles.helper}>Memuat bukti dan detail…</p>}
        {!selectedId && !loadingDetail && <p className={styles.helper}>Pilih pembaruan dari antrean.</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
        {update && update.id === selectedId && !loadingDetail && <>
          <div className={styles.reviewContent}>
          <article className={styles.reportCard}>
            <header className={styles.evidenceHeading}><h3><ShieldCheck size={22} aria-hidden="true" />Bukti pembaruan</h3><span><LockKeyhole size={13} aria-hidden="true" />Privat untuk moderator</span></header>
            <div className={styles.reportCopy}>
              <div className={styles.detailHead}><div><p className={styles.eyebrow}>LAPORAN #{update.reportId.slice(0, 8)} · REVISI {update.revision}</p><h2>{kindLabels[update.kind]}</h2></div>{update.status !== "submitted" && <span className={styles.status}>{update.status === "needs_evidence" ? "Bukti diminta" : update.status === "approved" ? "Disetujui" : "Ditolak"}</span>}</div>
              <div className={styles.residentNote}><strong>Keterangan warga</strong><p className={styles.description}>{update.description}</p></div>
              <div className={styles.meta}><Clock3 size={13} aria-hidden="true" /><span>Diamati: <time dateTime={update.observedAt}>{new Date(update.observedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}</time> WIB</span>{update.correctionField && <span>Koreksi: {update.correctionField}</span>}</div>
              {update.decisionReason && <p className={styles.helper}>Catatan moderator sebelumnya: {update.decisionReason}</p>}
              <a className={styles.originalReport} href={`/dashboard?view=admin-moderation&reviewReport=${encodeURIComponent(update.reportId)}`}>Lihat laporan awal<ExternalLink size={14} aria-hidden="true" /></a>
              {update.requestedEvidence.length > 0 && <div className={styles.notice}><strong>Bukti yang diminta pelapor:</strong> {update.requestedEvidence.join(" · ")}</div>}
            </div>
            <CommunityReviewEvidence key={update.id} media={media} choices={renditionChoice} channels={channels} renderBusy={renderBusy} disabled={busy} onChoice={(mediaId, value) => { setRenditionChoice(old => ({ ...old, [mediaId]: value })); setChannels(old => ({ ...old, [mediaId]: { web: false, instagram: false } })); }} onChannel={(mediaId, channel, checked) => setChannels(old => ({ ...old, [mediaId]: { web: old[mediaId]?.web ?? false, instagram: old[mediaId]?.instagram ?? false, [channel]: checked } }))} onRender={mediaId => void renderEvidence(mediaId)} />
          </article>
          {latestReview && <section className={styles.hermes} aria-labelledby="hermes-title">
            <div className={styles.hermesHead}><div className={styles.hermesHeading}><span className={styles.hermesIcon}><Sparkles size={22} aria-hidden="true" /></span><div><h3 id="hermes-title">Bantuan keputusan</h3><p>Hermes · {latestReview.status}</p><span className={styles.disclaimer}>Saran AI membantu pemeriksaan. Keputusan tetap oleh moderator.</span></div></div><button type="button" className={styles.smallButton} onClick={() => void requestReview()} disabled={busy || ["queued", "running"].includes(latestReview.status)}><RotateCw size={14} aria-hidden="true" />Minta rekomendasi ulang</button></div>
            {latestReview.status === "completed" && latestReview.result && <div className={styles.recommendation}>
              <strong className={styles.recommendationTitle}><Info size={16} aria-hidden="true" />{recommendationLabels[latestReview.result.recommendation]}</strong>
              {latestReview.result.reasonCodes.length > 0 && <div className={styles.reasonCodes}><span>Alasan utama</span>{latestReview.result.reasonCodes.map(code => <span className={styles.reasonChip} key={code} title={code}>{reasonLabels[code] ?? code}</span>)}</div>}
              {latestReview.result.evidence.length > 0 && <details className={styles.observations}><summary>Pengamatan Hermes</summary><ul>{latestReview.result.evidence.map((evidence) => <li key={evidence.mediaId}>{evidence.observation}</li>)}</ul></details>}
              {latestReview.result.missingEvidence.length > 0 && <div className={styles.checklist}><strong>Yang perlu diperiksa</strong><ul>{latestReview.result.missingEvidence.map((item, index) => <li key={`${index}-${item}`}><Search size={16} aria-hidden="true" /><span>{item}</span></li>)}</ul></div>}
              {latestReview.result.publicationWarnings.length > 0 && <div className={styles.warnings}><strong><Info size={15} aria-hidden="true" />Peringatan publikasi</strong><ul>{latestReview.result.publicationWarnings.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>}
              {latestReview.result.publicSummaryProposal && <div className={styles.proposal}><FileText size={17} aria-hidden="true" /><div><span>Usulan ringkasan (belum diterapkan):</span><p>{latestReview.result.publicSummaryProposal}</p></div><button type="button" className={styles.smallButton} onClick={() => setSummary(latestReview.result!.publicSummaryProposal!)} disabled={busy}><Copy size={14} aria-hidden="true" />Salin ke kolom moderator</button></div>}
            </div>}
            {latestReview.status === "failed" && <p className={styles.helper}>Rekomendasi gagal diproses ({latestReview.errorCode ?? "tanpa kode"}). Keputusan manual tetap tersedia.</p>}
          </section>}
          {!latestReview && <div className={styles.notice}><span>Hermes tidak mengambil tindakan sendiri. Minta rekomendasi bila fitur aktif; moderator tetap memutuskan.</span><button type="button" className={styles.smallButton} onClick={() => void requestReview()} disabled={busy}>Minta rekomendasi Hermes</button></div>}
          </div>
          <form className={styles.decision} onSubmit={(event) => void decide(event)}>
            <h3><ShieldCheck size={24} aria-hidden="true" />Keputusan moderator</h3>
            {update.status === "submitted" && <span className={styles.decisionState}>Belum dipublikasikan</span>}
            {update.status === "submitted" ? <>
              <div className={styles.decisionFields}>
                <fieldset className={styles.actionChoices} disabled={busy}><legend>Tindakan</legend>{decisionOptions.map(({ value, label, hint, icon: Icon }) => <label className={styles.actionOption} key={value} data-action={value} data-selected={action === value}><input type="radio" name="community-decision" value={value} checked={action === value} onChange={() => setAction(value)} /><span className={styles.actionIcon}><Icon size={19} aria-hidden="true" /></span><span><strong>{label}</strong><small>{hint}</small></span></label>)}</fieldset>
                {action === "approve" && <label><span>Ringkasan untuk kronologi publik</span><textarea rows={2} maxLength={500} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Tulis ringkasan yang akan ditampilkan ke publik…" disabled={busy} required /><small className={styles.fieldNote}><span>Gunakan informasi yang sudah diperiksa; jangan masukkan identitas atau data pribadi.</span><span>{summary.length}/500</span></small></label>}
                {action === "request_evidence" && <label><span>Bukti tambahan yang diminta (satu per baris)</span><textarea rows={2} maxLength={500} value={requestedEvidence} onChange={(event) => setRequestedEvidence(event.target.value)} placeholder="Contoh: foto kondisi terbaru dari lokasi yang sama…" disabled={busy} required /><small className={styles.fieldNote}><span>Maksimal tiga jenis bukti tambahan.</span><span>{requestedEvidence.length}/500</span></small></label>}
              </div>
              <div className={styles.decisionFooter}>
                <label><span>Alasan/catatan moderator (minimal 5 karakter)</span><textarea rows={2} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Tulis alasan atau catatan internal untuk keputusan ini…" disabled={busy} required minLength={5} /><small className={styles.fieldNote}><span /><span>{reason.length}/1000</span></small></label>
                <div className={styles.decisionActions}><button className={styles.submit} data-action={action} type="submit" aria-label={action === "approve" ? "Konfirmasi keputusan: setujui pembaruan" : action === "request_evidence" ? "Konfirmasi keputusan: minta bukti tambahan" : "Konfirmasi keputusan: tolak pembaruan"} disabled={busy || reason.trim().length < 5 || (action === "approve" && !summary.trim()) || (action === "request_evidence" && !requestedEvidence.trim())}><ShieldCheck size={18} aria-hidden="true" />{busy ? "Menyimpan…" : "Konfirmasi keputusan"}</button><button type="button" className={styles.smallButton} onClick={saveDraft} disabled={busy}><Save size={14} aria-hidden="true" />Simpan draf</button></div>
              </div>
              <p className={styles.disclaimer}>Kanal bukti hanya diajukan dari versi siap yang dipilih. Pastikan izin pengguna dan perlindungan privasi memang sesuai; backend tetap memvalidasi consent.</p>
            </> : <p className={styles.helper}>Status ini tidak dapat diputuskan ulang. Pelapor perlu mengirim revisi bila bukti tambahan diminta.</p>}
          </form>
        </>}
      </section>
    </div>
  </section>;
}

"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronRight, CirclePlus, CalendarDays, Image as ImageIcon, Info, MapPin, Search, ShieldCheck, UsersRound, X } from "lucide-react";
import { ApiError } from "../../lib/api/client";
import {
  followIncident,
  getIncident,
  incidentTimeline,
  incidentViewer,
  myUpdates,
  publicIncidents,
  supportIncident,
} from "../../lib/api/community";
import { permissionReason, type R1 } from "../../lib/api/r1";
import { loginDestination, safeReturnTo } from "../../lib/auth-return";
import ConditionForm from "./condition-form";
import PublicTrustNotice from "../trust/public-trust-notice";
import {
  date,
  Empty,
  Evidence,
  Failure,
  Heading,
  PublicShell,
  usePage,
} from "./community-ui";
import s from "./community.module.css";
import p from "./public-community.module.css";
import { CardOptions, CommunityHero, ExploreEmpty, ListSkeleton, publicAreaLabel } from "./public-community";
import { useI18n } from "../../lib/i18n/provider";

type IncidentCard = R1["PublicIncidentListItem"];
type IncidentStatus = IncidentCard["status"];
type IncidentCategory = NonNullable<IncidentCard["categoryId"]>;

const statusLabels: Record<IncidentStatus, string> = {
  verified: "Terverifikasi moderator",
  in_progress: "Dalam penanganan",
  resolved: "Selesai",
};
const categoryLabels: Record<IncidentCategory, string> = {
  battery: "Baterai",
  biological: "Organik",
  cardboard: "Kardus",
  clothes: "Pakaian",
  glass: "Kaca",
  metal: "Logam",
  paper: "Kertas",
  plastic: "Plastik",
  shoes: "Sepatu",
  trash: "Residu",
};
const categories = Object.entries(categoryLabels) as [IncidentCategory, string][];

export function IncidentExplore() {
  const { t, intlLocale } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<IncidentStatus | "">("");
  const [categoryId, setCategoryId] = useState<IncidentCategory | "">("");
  const [sort, setSort] = useState("latest");
  const [filters, setFilters] = useState({ search: "", status: "" as IncidentStatus | "", categoryId: "" as IncidentCategory | "" });
  useEffect(() => {
    const timer = setTimeout(() => setFilters((previous) => previous.search === search.trim() ? previous : { ...previous, search: search.trim() }), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const loader = useCallback((cursor?: string, signal?: AbortSignal) => publicIncidents({ cursor, search: filters.search || undefined, status: filters.status || undefined, categoryId: filters.categoryId || undefined }, signal), [filters]);
  const page = usePage(loader);
  const items = useMemo(() => [...page.items].sort((a, b) => {
    if (sort === "support") return b.supportCount - a.supportCount || Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    return sort === "oldest" ? Date.parse(a.updatedAt) - Date.parse(b.updatedAt) : Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  }), [page.items, sort]);
  const hasFilters = Boolean(search || status || categoryId);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ search: search.trim(), status, categoryId });
  }
  function reset() {
    setSearch(""); setStatus(""); setCategoryId("");
    setFilters({ search: "", status: "", categoryId: "" });
  }
  return <PublicShell>
    <CommunityHero variant="incidents" title={t("Kejadian publik dan kontribusi warga")}>
      {t("Lihat laporan publik yang sudah diverifikasi, lalu bantu kirim kondisi terbaru atau foto bukti untuk ditinjau moderator.")}
    </CommunityHero>
    <section className={p.accessPanel} aria-labelledby="akses-publik-title">
      <span className={p.accessIcon}><UsersRound size={28} aria-hidden="true" /></span>
      <div className={p.accessCopy}>
        <h2 id="akses-publik-title">{t("Akses publik tidak perlu login")}</h2>
        <p>{t("Semua orang bisa membaca kejadian publik. Login dan verifikasi email hanya diperlukan saat ingin mendukung, mengikuti kabar, atau mengirim pembaruan dengan foto.")}</p>
      </div>
      <div className={p.accessActions}>
        <a className={p.primaryButton} href="#daftar-kejadian">{t("Lihat daftar kejadian")}</a>
        <Link className={p.secondaryButton} href={loginDestination("/incidents")}><CirclePlus size={17} aria-hidden="true" />{t("Masuk untuk berkontribusi")}</Link>
      </div>
    </section>
    <form id="daftar-kejadian" className={p.filterPanel} onSubmit={submit} aria-label={t("Filter kejadian publik")}>
      <div className={p.incidentFilters}>
        <label className={p.field} htmlFor="cari-kejadian">
          <span className={p.fieldLabel}><Search size={14} aria-hidden="true" />{t("Cari kejadian")}</span>
          <span className={p.searchField}><Search size={17} aria-hidden="true" />
            <input id="cari-kejadian" type="search" aria-label={t("Cari kejadian")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Contoh: plastik, sungai, area")} autoComplete="off" />
            {search && <button className={p.clearSearch} type="button" aria-label={t("Hapus pencarian")} onClick={() => setSearch("")}><X size={15} aria-hidden="true" /></button>}
          </span>
        </label>
        <label className={p.field}>
          <span>{t("Status")}</span><span className={p.selectField}>
            <select value={status} onChange={(event) => { const value = event.target.value as IncidentStatus | ""; setStatus(value); setFilters((previous) => ({ ...previous, status: value })); }}>
              <option value="">{t("Semua status")}</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
            </select><ChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
        <label className={p.field}>
          <span>{t("Kategori")}</span><span className={p.selectField}>
            <select value={categoryId} onChange={(event) => { const value = event.target.value as IncidentCategory | ""; setCategoryId(value); setFilters((previous) => ({ ...previous, categoryId: value })); }}>
              <option value="">{t("Semua kategori")}</option>
              {categories.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
            </select><ChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
      </div>
      {hasFilters && <div className={p.filterFooter}><span>{t("Hasil diperbarui sesuai filter Anda.")}</span><button type="button" className={p.textButton} onClick={reset}><X size={14} aria-hidden="true" />{t("Reset filter")}</button></div>}
    </form>
    {page.error !== null && <Failure error={page.error} retry={page.refresh} />}
    <section className={p.resultsSection} aria-labelledby="incident-results-title" aria-busy={page.loading}>
      <div className={p.resultsBar}>
        <h2 id="incident-results-title" aria-live="polite">{page.loading ? t("Memuat kejadian…") : t("{count} kejadian publik", { count: String(page.items.length) + (page.cursor ? "+" : "") })}</h2>
        <label className={p.sortField}><span>{t("Urutkan")}</span><span className={p.selectField}>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label={t("Urutkan kejadian")}>
            <option value="latest">{t("Terbaru")}</option><option value="oldest">{t("Terlama")}</option><option value="support">{t("Dukungan terbanyak")}</option>
          </select><ChevronDown size={14} aria-hidden="true" />
        </span></label>
      </div>
      {page.loading && !page.items.length ? <ListSkeleton /> : <div className={p.cardGrid}>
        {items.map((incident) => <article className={p.listCard} key={incident.id}>
          <div className={p.cardTop}>
            <div className={p.badges}><span className={p.statusBadge} data-status={incident.status}>{incident.status === "resolved" ? <CheckCircle2 size={14} aria-hidden="true" /> : <ShieldCheck size={14} aria-hidden="true" />}{t(statusLabels[incident.status])}</span>
              {incident.categoryId && <span className={p.categoryBadge}>{t(categoryLabels[incident.categoryId])}</span>}
            </div><CardOptions href={incident.canonicalPath} title={incident.title} />
          </div>
          <h2 className={p.cardTitle}><Link href={incident.canonicalPath}>{incident.title}</Link></h2>
          <div className={[p.incidentBody, incident.evidence.length ? p.incidentBodyWithEvidence : ""].join(" ")}>
            <div className={p.incidentText}>
              <div className={p.cardMetadata}><span className={p.metadataItem}><MapPin size={16} aria-hidden="true" />{publicAreaLabel(incident.area, t)}</span>
                <span className={p.metadataItem}><CalendarDays size={16} aria-hidden="true" /><time dateTime={incident.lastObservedAt ?? incident.occurredAt}>{date(incident.lastObservedAt ?? incident.occurredAt, intlLocale)}</time></span>
              </div>
              <p className={p.cardSummary}>{incident.summary || t("Ringkasan publik belum tersedia.")}</p>
            </div>
            {incident.evidence.length > 0 && <div className={p.evidenceFrame}><Evidence items={incident.evidence.slice(0, 1)} /><span className={p.evidenceLabel}><ImageIcon size={12} aria-hidden="true" />{t("Bukti yang disetujui VERGO")}</span></div>}
          </div>
          {!incident.evidence.length && <p className={p.evidenceNotice}><Info size={19} aria-hidden="true" /><span>{t("Bukti publik belum tersedia; pembaruan warga masih bisa dikirim untuk ditinjau.")}</span></p>}
          <div className={p.cardFooter}><span className={p.supportCount}><UsersRound size={17} aria-hidden="true" /><span>{t("{0} dukungan warga", { "0": incident.supportCount })}</span></span>
            <Link className={p.cardButton} href={incident.canonicalPath + "#kontribusi-warga"}>{t("Lihat detail & kontribusi")}<ChevronRight size={18} aria-hidden="true" /></Link>
          </div>
        </article>)}
      </div>}
      {!page.loading && !page.items.length && page.error === null && <ExploreEmpty title={t("Belum ada kejadian publik untuk filter ini.")}>{t("Coba kata kunci lain atau perluas pilihan status dan kategori.")}</ExploreEmpty>}
      {page.loading && page.items.length > 0 && <p className={p.loadingText} role="status">{t("Memuat kejadian…")}</p>}
    </section>
    {page.cursor && <button type="button" disabled={page.loading} className={[p.secondaryButton, p.loadMore].join(" ")} onClick={() => void page.more()}>{t("Muat kejadian berikutnya")}<ChevronDown size={16} aria-hidden="true" /></button>}
  </PublicShell>;
}

export default function IncidentPage({ id }: { id: string }) {
  const { t, intlLocale } = useI18n();
  const router = useRouter();
  const [incident, setIncident] = useState<R1["PublicIncident"] | null>(null),
    [events, setEvents] = useState<R1["PublicTimelineEvent"][]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [viewer, setViewer] = useState<R1["IncidentViewer"] | null>(null),
    [guest, setGuest] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [timelineError, setTimelineError] = useState<unknown>(null),
    [epoch, setEpoch] = useState(0),
    [form, setForm] = useState(false),
    [formKind, setFormKind] = useState<R1["CommunityUpdateInput"]["kind"]>("still_present"),
    [editingUpdate, setEditingUpdate] = useState<R1["CommunityUpdate"] | null>(null),
    [myContributions, setMyContributions] = useState<R1["CommunityUpdate"][]>([]),
    [myContributionsError, setMyContributionsError] = useState(""),
    [contributionMessage, setContributionMessage] = useState("");
  const actionBlocked =
    busy ||
    (timelineError instanceof ApiError &&
      timelineError.code === "OPERATION_UNCERTAIN");
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError(null);
    setTimelineError(null);
    setIncident(null);
    setEvents([]);
    setCursor(null);
    setViewer(null);
    setGuest(false);
    setForm(false);
    setFormKind("still_present");
    setEditingUpdate(null);
    setMyContributions([]);
    setMyContributionsError("");
    setContributionMessage("");
    const contributionIntent = new URLSearchParams(window.location.search).get("contribute");
    const requestedKind = contributionIntent === "correction" ? "information_wrong" : contributionIntent === "condition" ? "still_present" : null;
    void getIncident(id, c.signal)
      .then(async (value) => {
        if (c.signal.aborted) return;
        if (value.kind === "redirect") {
          const target = safeReturnTo(value.canonicalPath);
          if (
            target !== `/incidents/${value.canonicalId}` ||
            value.canonicalId === id
          )
            throw new Error("Tujuan kejadian canonical tidak valid.");
          router.replace(target);
          return;
        }
        setIncident(value);
        const results = await Promise.allSettled([
          incidentTimeline(id, undefined, c.signal),
          incidentViewer(id, c.signal),
        ]);
        if (c.signal.aborted) return;
        const timeline = results[0];
        if (timeline.status === "fulfilled") {
          setEvents(timeline.value.items);
          setCursor(timeline.value.nextCursor);
        } else if (
          timeline.reason instanceof ApiError &&
          timeline.reason.status === 410
        ) {
          setIncident(null);
          setEvents([]);
          setError(timeline.reason);
          return;
        } else setTimelineError(timeline.reason);
        const access = results[1];
        if (access.status === "fulfilled") {
          setViewer(access.value);
          void myUpdates(undefined,c.signal,id).then(page=>{
            if(!c.signal.aborted)setMyContributions(page.items);
          }).catch(cause=>{
            if(!c.signal.aborted)setMyContributionsError(cause instanceof Error?cause.message:"Riwayat pembaruan Anda belum dapat dimuat.");
          });
          if(requestedKind&&access.value.actions.update.allowed){
            setFormKind(requestedKind);setEditingUpdate(null);setForm(true);
            window.history.replaceState(null,"",`${window.location.pathname}#kontribusi-warga`);
          }
        }
        else if (
          access.reason instanceof ApiError &&
          access.reason.status === 410
        ) {
          setIncident(null);
          setEvents([]);
          setError(access.reason);
        } else if (
          access.reason instanceof ApiError &&
          access.reason.status === 401
        )
          setGuest(true);
        else setTimelineError(access.reason);
      })
      .catch((e) => {
        if (!c.signal.aborted) {
          setIncident(null);
          setEvents([]);
          setError(e);
        }
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [id, epoch, router]);
  async function action(kind: "support" | "follow") {
    if (!viewer || !incident || busy) return;
    setBusy(true);
    setTimelineError(null);
    try {
      if (kind === "support") {
        const value = await supportIncident(id, !viewer.supported);
        setViewer({ ...viewer, supported: value.supported });
        setIncident({
          ...incident,
          supportCount: value.supportCount,
          supportClosed: value.supportClosed,
        });
      } else {
        const value = await followIncident(id, !viewer.following);
        setViewer({ ...viewer, following: value.following });
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 410) {
        setIncident(null);
        setEvents([]);
        setError(e);
      } else setTimelineError(e);
    } finally {
      setBusy(false);
    }
  }
  async function more() {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const page = await incidentTimeline(id, cursor);
      setEvents((v) => [...v, ...page.items]);
      setCursor(page.nextCursor);
    } catch (e) {
      if (e instanceof ApiError && e.status === 410) {
        setIncident(null);
        setEvents([]);
        setError(e);
      } else setTimelineError(e);
    } finally {
      setBusy(false);
    }
  }
  function openContribution(kind:R1["CommunityUpdateInput"]["kind"],previous:R1["CommunityUpdate"]|null=null){
    setFormKind(kind);setEditingUpdate(previous);setForm(true);
  }
  return (
    <PublicShell>
      {loading ? (
        <p role="status">{t("Memuat kejadian publik…")}</p>
      ) : error !== null ? (
        <Failure error={error} retry={() => setEpoch((v) => v + 1)} />
      ) : incident ? (
        <>
          <Heading title={incident.title}>{publicAreaLabel(incident.area, t)}</Heading>
          <div className={s.grid}>
            <div className={s.page}>
              <section className={s.card}>
                <div className={s.meta}>
                  <span className={s.badge}>{t(statusLabels[incident.status])}</span>
                  <span>{date(incident.occurredAt, intlLocale)}</span>
                </div>
                <p className={s.pre}>{incident.summary}</p>
                {incident.latestCorrection && <aside className={s.notice}>
                  <strong>{t("Koreksi terbaru yang ditinjau moderator")}</strong>
                  <p className={s.pre}>{incident.latestCorrection.summary}</p>
                  <small>{t("Diperbarui")}: {date(incident.latestCorrection.createdAt,intlLocale)}</small>
                </aside>}
                <p className={s.muted}>{t("Waktu pengamatan terakhir")}: {date(incident.lastObservedAt,intlLocale)} · {t("Data halaman diperbarui")}: {date(incident.updatedAt,intlLocale)}</p>
                <Evidence items={incident.evidence} />
                <button
                  className={s.secondary}
                  onClick={() => setEpoch((v) => v + 1)}
                >
                  {t("Muat ulang informasi")}</button>
              </section>
              <section className={`${s.card} ${s.contributionCard}`} id="kontribusi-warga">
                <span className={s.eyebrow}>{t("Kontribusi Warga")}</span>
                <h2>{t("Kirim kondisi terbaru atau laporkan informasi keliru")}</h2>
                <p className={s.muted}>
                  {t("Pilih pembaruan kondisi atau laporkan informasi yang keliru. Tuliskan pengamatan dan waktunya; foto menjadi bukti privat sampai moderator menyetujuinya.")}</p>
                {guest ? (
                  <div className={s.actions}>
                    <Link className={s.button} href={loginDestination(`/incidents/${id}?contribute=condition#kontribusi-warga`)}>{t("Masuk untuk memperbarui kondisi")}</Link>
                    <Link className={s.secondary} href={loginDestination(`/incidents/${id}?contribute=correction#kontribusi-warga`)}>{t("Masuk untuk melaporkan informasi keliru")}</Link>
                    <Link className={s.secondary} href="/incidents">
                      {t("Lihat kejadian publik lain")}</Link>
                  </div>
                ) : viewer ? (
                  <>
                    <div className={s.actions}>
                      <button
                        className={s.button}
                        disabled={busy || !viewer.actions.update.allowed}
                        onClick={() => openContribution("still_present")}
                      >
                        {t("Perbarui kondisi")}</button>
                      <button className={s.secondary} disabled={busy || !viewer.actions.update.allowed} onClick={()=>openContribution("information_wrong")}>
                        {t("Laporkan informasi keliru")}</button>
                      <Link className={s.secondary} href="/incidents">
                        {t("Lihat kejadian publik lain")}</Link>
                    </div>
                    {!viewer.actions.update.allowed && viewer.actions.update.reasonCode && (
                      <small className={s.muted}>
                        {t(permissionReason(viewer.actions.update.reasonCode))}</small>
                    )}
                  </>
                ) : (
                  <p className={s.muted}>{t("Memeriksa akses kontribusi…")}</p>
                )}
              </section>
              {form && (
                <ConditionForm
                  incidentId={id}
                  initialKind={formKind}
                  previous={editingUpdate ?? undefined}
                  onSaved={(saved) => {
                    setForm(false);
                    setEditingUpdate(null);
                    setMyContributions(current=>[saved,...current.filter(item=>item.id!==saved.id)]);
                    setContributionMessage(
                      "Pembaruan terkirim untuk ditinjau. Moderator akan memutuskan sebelum foto atau ringkasan tampil publik.",
                    );
                  }}
                  onClose={() => setForm(false)}
                />
              )}
              {contributionMessage && (
                <p role="status" className={s.notice}>
                  {t(contributionMessage)}</p>
              )}
              {viewer&&<section className={s.card}>
                <h2>{t("Pembaruan Anda untuk kejadian ini")}</h2>
                {myContributionsError&&<p className={s.muted} role="status">{t(myContributionsError)}</p>}
                {!myContributionsError&&!myContributions.length&&<Empty>{t("Belum ada pembaruan dari akun Anda untuk kejadian ini.")}</Empty>}
                {!!myContributions.length&&<ol className={s.timeline}>{myContributions.map(item=><li key={item.id}>
                  <strong>{t(item.kind==="information_wrong"?"Koreksi informasi":"Pembaruan kondisi")} · {t(({submitted:"Menunggu pemeriksaan",needs_evidence:"Perlu bukti tambahan",approved:"Disetujui moderator",rejected:"Tidak disetujui"} as const)[item.status])}</strong>
                  <p>{date(item.observedAt,intlLocale)} · {item.description}</p>
                  {item.requestedEvidence.length>0&&<div className={s.notice}><strong>{t("Bukti yang diminta moderator")}</strong><ul>{item.requestedEvidence.map((text,index)=><li key={index}>{text}</li>)}</ul></div>}
                  {item.decisionReason&&<p className={s.muted}>{item.decisionReason}</p>}
                  {item.status==="needs_evidence"&&<button type="button" className={s.secondary} disabled={!viewer.actions.update.allowed} onClick={()=>openContribution(item.kind,item)}>{t("Lengkapi bukti yang diminta")}</button>}
                </li>)}</ol>}
              </section>}
              <section className={s.card}>
                <h2>{t("Perjalanan kejadian")}</h2>
                {events.length ? (
                  <ol className={s.timeline}>
                    {events.map((event) => (
                      <li key={event.id}>
                        <strong>{date(event.occurredAt, intlLocale)}</strong>
                        <p>{event.summary}</p>
                        {event.evidence.length > 0 && <Evidence items={event.evidence} />}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Empty>{t("Belum ada kabar publik untuk kejadian ini.")}</Empty>
                )}
                {cursor && (
                  <button
                    className={s.secondary}
                    disabled={busy}
                    onClick={() => void more()}
                  >
                    {t("Muat kabar berikutnya")}</button>
                )}
              </section>
            </div>
            <aside className={s.card}>
              <h2>{t("Ikut peduli")}</h2>
              <section className={s.notice}>
                <strong>{t("Status penanganan")}</strong>
                {incident.handling?<p>{t(({assigned:"Penugasan dibuat",accepted:"Tugas diterima",working:"Penanganan sedang berjalan",done:"Progres tugas ditandai selesai"} as const)[incident.handling.progress])} · {date(incident.handling.updatedAt,intlLocale)}</p>:<p>{t("Belum ada penanggung jawab yang ditugaskan; progres penanganan belum tercatat.")}</p>}
                <small>{t("Progres tugas adalah catatan tindak lanjut; status Selesai tetap memerlukan keputusan moderator berdasarkan bukti.")}</small>
              </section>
              <p>{t("{0} dukungan warga", { "0": incident.supportCount })}</p>
              <p className={s.muted}>
                {t("Dukung kejadian untuk menunjukkan kepedulian. Ikuti kabar untuk menerima pembaruan.")}</p>
              {guest ? (
                <Link
                  className={s.button}
                  href={loginDestination(`/incidents/${id}#kontribusi-warga`)}
                >
                  {t("Masuk untuk berkontribusi")}</Link>
              ) : viewer ? (
                <>
                  <button
                    className={s.button}
                    disabled={actionBlocked || !viewer.actions.support.allowed}
                    onClick={() => void action("support")}
                  >
                    {viewer.supported ? t("Batalkan dukungan") : t("Dukung kejadian")}
                  </button>
                  <button
                    className={s.secondary}
                    disabled={actionBlocked || !viewer.actions.follow.allowed}
                    onClick={() => void action("follow")}
                  >
                    {viewer.following ? t("Berhenti mengikuti") : t("Ikuti kabar")}
                  </button>
                  <button
                    className={s.secondary}
                    disabled={busy || !viewer.actions.update.allowed}
                    onClick={() => openContribution("still_present")}
                  >
                    {t("Bagikan kondisi terbaru")}</button>
                  {Object.values(viewer.actions)
                    .filter((a) => !a.allowed && a.reasonCode)
                    .map((a, i) => (
                      <small key={i} className={s.muted}>
                        {t(permissionReason(a.reasonCode))}
                      </small>
                    ))}
                </>
              ) : null}
              {incident.supportClosed && (
                <p className={s.notice}>{t("Dukungan baru telah ditutup.")}</p>
              )}
              <h3>{t("Kegiatan terkait")}</h3>
              {incident.relatedActivityIds.length ? (
                incident.relatedActivityIds.map((activity) => (
                  <Link
                    className={s.link}
                    key={activity}
                    href={`/activities/${activity}`}
                  >
                    {t("Lihat kegiatan relawan →")}</Link>
                ))
              ) : (
                <p className={s.muted}>{t("Belum ada kegiatan publik.")}</p>
              )}
            </aside>
          </div>
          {timelineError !== null && (
            <Failure
              error={timelineError}
              retry={() => setEpoch((v) => v + 1)}
            />
          )}
          <PublicTrustNotice />
        </>
      ) : (
        <Empty>{t("Informasi kejadian belum tersedia.")}</Empty>
      )}
    </PublicShell>
  );
}

import { useId, useState } from "react";
import Image from "next/image";
import { AlertCircle, ArrowRight, Bell, CalendarClock, CheckCircle2, ClipboardCheck, Clock3, Info, Loader2, Pencil, RefreshCw } from "lucide-react";
import { useI18n } from "../../lib/i18n/provider";
import { STATUS_LABEL } from "../moderation/report-status";
import type { OperationReport } from "./admin-operations";
import styles from "./report-assignments.module.css";

type Filter = "all" | "active" | "completed";
type Props = {
  items: OperationReport[];
  cursor: string | null;
  loading: boolean;
  error: string;
  message: string;
  onReload: () => void;
  onMore: () => void;
  onUpdate: (report: OperationReport) => void;
};

function AssignmentDate({ value }: { value: string | null }) {
  const { t, intlLocale } = useI18n();
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime())
    ? <time dateTime={value!}>{new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short" }).format(date)}</time>
    : <>{t("Belum ditentukan")}</>;
}

function AssignmentCard({ report, onUpdate }: { report: OperationReport; onUpdate: Props["onUpdate"] }) {
  const { t } = useI18n();
  const headingId = useId();
  const assignment = report.assignment;
  const progress = assignment?.progress;
  const progressLabels = { assigned: "Ditugaskan", accepted: "Tugas diterima", working: "Sedang dikerjakan", done: "Tugas selesai" };
  return <li className={styles.task} aria-labelledby={headingId}>
    <div className={styles.taskHeading}>
      <div><p className={styles.reference}>{t("Laporan #{0}", { "0": report.id.slice(0, 8) })}</p><h3 id={headingId}>{report.description || t("Laporan")}</h3></div>
      <span className={styles.reportStatus}>{t(STATUS_LABEL[report.status])}</span>
    </div>
    <p className={styles.created}>{t("Dilaporkan")}: <AssignmentDate value={report.createdAt} /></p>
    {assignment?.note && <div className={styles.assignmentNote}><strong>{t("Catatan penugasan")}</strong><p>{assignment.note}</p></div>}
    <dl className={styles.details}>
      <div><dt><CalendarClock size={17} aria-hidden="true" />{t("Tenggat")}</dt><dd><AssignmentDate value={assignment?.dueAt || null} />{assignment?.overdue && <span className={styles.overdue}><Clock3 size={13} aria-hidden="true" />{t("Lewat tenggat")}</span>}</dd></div>
      <div><dt><ClipboardCheck size={17} aria-hidden="true" />{t("Progres tugas")}</dt><dd><span className={styles.progress} data-completed={assignment?.completed || false}>{assignment?.completed && <CheckCircle2 size={15} aria-hidden="true" />}{t(progress ? progressLabels[progress] : "Belum tersedia")}</span>{assignment?.progressNote && <p className={styles.progressNote}>{assignment.progressNote}</p>}</dd></div>
    </dl>
    {assignment && !assignment.completed && <div className={styles.taskActions}><button type="button" className={styles.outlineButton} onClick={() => onUpdate(report)}><Pencil size={16} aria-hidden="true" />{t("Perbarui progres")}<ArrowRight size={17} aria-hidden="true" /></button></div>}
  </li>;
}

function EmptyAssignments({ filter, onShowAll }: { filter: Filter; onShowAll: () => void }) {
  const { t } = useI18n();
  const filtered = filter !== "all";
  return <div className={styles.empty}>
    <div className={styles.artwork} aria-hidden="true"><Image src="/images/report-assignments/empty-clipboard.webp" width={240} height={240} sizes="(max-width: 700px) 180px, 240px" loading="eager" alt="" /></div>
    <h2>{t(filter === "active" ? "Tidak ada tugas aktif" : filter === "completed" ? "Belum ada tugas selesai" : "Belum ada tugas laporan")}</h2>
    <p>{filtered ? t("Tidak ada tugas pada filter ini. Lihat semua tugas atau muat lebih banyak jika tersedia.") : <>{t("Belum ada laporan yang ditugaskan kepada Anda.")}<br />{" "}{t("Detail laporan dan tenggat akan muncul di sini saat tugas tersedia.")}</>}</p>
    {filtered ? <button type="button" className={styles.outlineButton} onClick={onShowAll}>{t("Lihat semua tugas")}<ArrowRight size={19} aria-hidden="true" /></button>
      : <a className={styles.outlineButton} href="/dashboard?view=notifications"><Bell size={21} aria-hidden="true" />{t("Lihat notifikasi")}<ArrowRight size={19} aria-hidden="true" /></a>}
  </div>;
}

function AssignmentGuide() {
  const { t } = useI18n();
  const headingId = useId();
  const steps = [
    ["Terima penugasan", "Tinjau laporan dan tenggat dari admin."],
    ["Perbarui progres", "Catat perkembangan penanganan."],
    ["Selesaikan tugas", "Konfirmasi setelah pekerjaan selesai."],
  ];
  return <aside className={styles.sidebar} aria-labelledby={headingId}>
    <section className={styles.guide}>
      <header className={styles.guideHeader}><span className={styles.guideIcon}><ClipboardCheck size={30} aria-hidden="true" /></span><div><h2 id={headingId}>{t("Alur penugasan")}</h2><p>{t("Dari penugasan hingga selesai.")}</p></div></header>
      <ol className={styles.steps}>{steps.map(([title, description], index) => <li key={title}><span aria-hidden="true">{index + 1}</span><div><h3>{t(title)}</h3><p>{t(description)}</p></div></li>)}</ol>
    </section>
    <div className={styles.help}><span><Info size={23} aria-hidden="true" /></span><div><h3>{t("Progres tercatat")}</h3><p>{t("Tambahkan catatan saat memperbarui progres agar tindak lanjut mudah dipantau.")}</p></div></div>
  </aside>;
}

export default function ReportAssignmentWorkspace({ items, cursor, loading, error, message, onReload, onMore, onUpdate }: Props) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const completed = items.filter(report => report.assignment?.completed).length;
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "Semua", count: items.length },
    { id: "active", label: "Tugas aktif", count: items.length - completed },
    { id: "completed", label: "Selesai", count: completed },
  ];
  const visible = items.filter(report => filter === "all" || (filter === "completed" ? Boolean(report.assignment?.completed) : !report.assignment?.completed));
  const unavailable = !items.length && Boolean(loading || error);
  return <section className={styles.page} aria-label={t("Tugas laporan saya")}>
    <header className={styles.header}><div><p className={styles.eyebrow}>{t("Ruang tugas")}</p><h1>{t("Tugas laporan saya")}</h1><p className={styles.intro}>{t("Pantau penugasan, tenggat, dan progres penanganan laporan.")}</p></div><button type="button" className={`${styles.button} ${styles.reload}`} disabled={loading} onClick={onReload}><RefreshCw size={19} className={loading ? styles.spin : undefined} aria-hidden="true" /><span>{t("Muat ulang")}</span></button></header>
    {message && <div className={styles.success} role="status"><CheckCircle2 size={18} aria-hidden="true" />{t(message)}</div>}
    <div className={styles.layout}>
      <section className={styles.panel} aria-label={t("Daftar tugas laporan")}>
        <div className={styles.panelHeader}><div className={styles.filters} role="group" aria-label={t("Filter tugas")}>{filters.map(item => <button key={item.id} type="button" className={styles.filter} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{t(item.label)}<span className={styles.count}>{unavailable ? "—" : item.count}</span></button>)}</div><p className={styles.countLabel}>{unavailable ? t(loading ? "Memuat tugas..." : "Tugas belum tersedia") : t(cursor ? "{0} tugas dimuat" : "{0} tugas", { "0": items.length })}</p></div>
        {error && <div className={styles.error} role="alert"><AlertCircle size={19} aria-hidden="true" /><div><p>{t(error)}</p><button type="button" className={styles.retry} disabled={loading} onClick={cursor && items.length ? onMore : onReload}>{t("Coba lagi")}</button></div></div>}
        <div className={styles.results} aria-busy={loading}>
          {visible.length > 0 && <ul className={styles.tasks}>{visible.map(report => <AssignmentCard key={report.id} report={report} onUpdate={onUpdate} />)}</ul>}
          {loading && <div className={styles.loading} role="status"><Loader2 size={21} className={styles.spin} aria-hidden="true" />{t("Memuat tugas...")}</div>}
          {!loading && !error && !visible.length && <EmptyAssignments filter={filter} onShowAll={() => setFilter("all")} />}
        </div>
        {!unavailable && <footer className={styles.pager}><div><span>{t("{0} tugas ditampilkan", { "0": visible.length })}</span>{cursor && <small>{t("Jumlah sesuai tugas yang sudah dimuat.")}</small>}</div>{cursor && <button type="button" className={styles.button} disabled={loading} onClick={onMore}>{loading && <Loader2 size={16} className={styles.spin} aria-hidden="true" />}{t("Muat lagi")}</button>}</footer>}
      </section>
      <AssignmentGuide />
    </div>
  </section>;
}

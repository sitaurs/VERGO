import Image from "next/image";
import { ArrowRight, FileText } from "lucide-react";
import { useI18n } from "../../lib/i18n/provider";
import styles from "./notifications.module.css";

export default function NotificationEmptyState({ unreadOnly, onShowAll }: { unreadOnly: boolean; onShowAll: () => void }) {
  const { t } = useI18n();
  return <div className={styles.empty}>
    <div className={styles.emptyArtwork} aria-hidden="true">
      <Image src="/images/notifications/empty-bell.webp" width={240} height={240} sizes="(max-width: 600px) 180px, 220px" loading="eager" alt="" />
    </div>
    <h2>{t(unreadOnly ? "Tidak ada notifikasi belum dibaca" : "Belum ada notifikasi")}</h2>
    <p>{unreadOnly ? t("Semua notifikasi yang sudah dimuat telah dibaca. Anda dapat memuat lebih banyak jika tersedia.") : <>{t("Pembaruan laporan dan aktivitas Anda akan muncul di sini.")}<br />{" "}{t("Kami akan memberi tahu saat ada perkembangan baru.")}</>}</p>
    {unreadOnly ? <button type="button" className={styles.outlineButton} onClick={onShowAll}>{t("Lihat semua notifikasi")}<ArrowRight size={18} aria-hidden="true" /></button>
      : <a className={styles.outlineButton} href="/dashboard?view=reports"><FileText size={20} aria-hidden="true" />{t("Lihat laporan saya")}<ArrowRight size={18} aria-hidden="true" /></a>}
  </div>;
}

import { Check, CircleAlert, Info, Loader2, Mail } from "lucide-react";
import { useI18n } from "../../lib/i18n/provider";
import styles from "./notifications.module.css";

type Props = {
  enabled: boolean | null;
  draft: boolean;
  loading: boolean;
  saving: boolean;
  error: string;
  message: string;
  onChange: (value: boolean) => void;
  onSave: () => Promise<void>;
  onRetry: () => void;
};

export default function EmailPreferencesCard({ enabled, draft, loading, saving, error, message, onChange, onSave, onRetry }: Props) {
  const { t } = useI18n();
  const dirty = enabled !== null && enabled !== draft;
  const disabled = enabled === null || loading || saving;
  const status = loading ? "Memuat preferensi..." : enabled === null ? "Preferensi belum tersedia" : enabled ? "Email aktif" : "Email nonaktif";
  return <aside className={styles.sidebar} aria-label={t("Pengaturan notifikasi")}>
    <form data-motion="card" className={styles.preferences} aria-labelledby="notification-email-heading" aria-busy={loading || saving} onSubmit={event => { event.preventDefault(); void onSave(); }}>
      <header className={styles.preferenceHeader}>
        <span className={styles.mailTile}><Mail size={29} strokeWidth={1.9} aria-hidden="true" /></span>
        <div><h2 id="notification-email-heading">{t("Preferensi email")}</h2><p>{t(status)}</p></div>
      </header>
      <label className={styles.preferenceOption}>
        <span className={styles.switchRow}><strong>{t("Notifikasi laporan")}</strong>
          <span className={styles.switch}>
            <input type="checkbox" role="switch" aria-label={t("Notifikasi laporan melalui email")} checked={draft} disabled={disabled} onChange={event => onChange(event.target.checked)} />
            <span className={styles.switchTrack} aria-hidden="true" />
          </span>
        </span>
        <span className={styles.optionDescription}>{t("Terima pembaruan status laporan melalui email.")}</span>
      </label>
      <div className={styles.preferenceFooter}>
        <button type="submit" className={styles.saveButton} disabled={disabled || !dirty}>
          {saving ? <Loader2 size={18} className={styles.spin} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
          {t(saving ? "Menyimpan preferensi..." : "Simpan preferensi")}
        </button>
        <p className={dirty ? styles.dirtyHint : message && !saving ? styles.savedHint : styles.hint} role="status">{t(loading ? "Memuat preferensi..." : saving ? "Menyimpan preferensi..." : dirty ? "Perubahan belum disimpan." : message || "Ubah pengaturan untuk menyimpan preferensi.")}</p>
      </div>
      {error && <div className={styles.preferenceError} role="alert"><CircleAlert size={18} aria-hidden="true" /><div><p>{t(error)}</p><button type="button" className={styles.retryButton} onClick={onRetry} disabled={saving || loading}>{t("Coba lagi")}</button></div></div>}
    </form>
    <div data-motion="card" className={styles.help}>
      <span><Info size={22} aria-hidden="true" /></span><div><h3>{t("Tetap terhubung")}</h3><p>{t("Notifikasi tetap dapat dilihat di halaman ini meskipun email dinonaktifkan.")}</p></div>
    </div>
  </aside>;
}

"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Languages } from "lucide-react";
import { useI18n } from "../../lib/i18n/provider";
import type { Locale } from "../../lib/i18n/config";
import styles from "./language-switcher.module.css";

const languages: { value: Locale; name: string }[] = [
  { value: "id", name: "Bahasa Indonesia" },
  { value: "en", name: "English" },
];

export default function LanguageSwitcher({ onOpen, onFeedback }: { onOpen?: () => void; onFeedback: (message: string) => void }) {
  const { locale, t, setLocale } = useI18n();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const current = languages.find(language => language.value === locale)!;

  const close = useCallback((restoreFocus = false) => {
    if (menu.current?.matches(":popover-open")) menu.current.hidePopover();
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const dismiss = () => close();
    const onScroll = (event: Event) => {
      if (!(event.target instanceof Node) || !menu.current?.contains(event.target)) close();
    };
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("popstate", dismiss);
    return () => {
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("popstate", dismiss);
    };
  }, [open, close]);

  function prepare() {
    const button = trigger.current;
    if (!button || !button.getClientRects().length || !menu.current) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 32);
    setPosition({ top: rect.bottom + 10, left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)) });
    onOpen?.();
  }

  function choose(next: Locale) {
    if (next !== locale) {
      onFeedback(setLocale(next) ? "Bahasa tampilan berhasil diubah." : "Bahasa berubah untuk sesi ini. Izinkan penyimpanan browser agar pilihan tetap tersimpan.");
    }
    close(true);
  }

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const index = options.current.indexOf(document.activeElement as HTMLButtonElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? languages.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + languages.length) % languages.length;
      options.current[next]?.focus({ preventScroll: true });
    } else if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation(); close(true);
    } else if (event.key === "Tab") {
      close(true);
    }
  }

  return <div className={styles.switcher}>
    <button ref={trigger} type="button" className={styles.trigger} title={t("Ubah bahasa")} aria-label={t("Ubah bahasa, saat ini {0}", { "0": current.name })} aria-haspopup="menu" aria-controls={`${id}-menu`} aria-expanded={open} popoverTarget={`${id}-menu`} popoverTargetAction="toggle"
      onClick={() => { if (!menu.current?.matches(":popover-open")) prepare(); }}
      onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const focus = event.key === "ArrowDown" ? 0 : languages.length - 1; if (!menu.current?.matches(":popover-open")) trigger.current?.click(); options.current[focus]?.focus({ preventScroll: true }); } else if (event.key === "Tab") close(); }}>
      <Languages size={25} strokeWidth={1.8} aria-hidden="true" /><span className={styles.badge} aria-hidden="true">{locale.toUpperCase()}</span>
    </button>
    <div ref={menu} id={`${id}-menu`} popover="auto" role="menu" aria-labelledby={`${id}-heading`} className={styles.menu} style={position} onKeyDown={navigate} onBlurCapture={event => { if (event.relatedTarget instanceof Node && event.relatedTarget !== trigger.current && !event.currentTarget.contains(event.relatedTarget)) close(); }}
      onToggle={() => setOpen(menu.current?.matches(":popover-open") ?? false)}>
      <h2 id={`${id}-heading`} className={styles.heading}>{t("Pilih bahasa")}</h2>
      <div className={styles.options}>{languages.map((language, index) => <button ref={node => { options.current[index] = node; if (node) node.autofocus = locale === language.value; }} key={language.value} type="button" role="menuitemradio" aria-checked={locale === language.value} aria-label={language.name} tabIndex={-1} className={styles.option} onClick={() => choose(language.value)}>
        <span className={styles.radio} aria-hidden="true" /><span className={styles.copy}><strong lang={language.value}>{language.name}</strong>{locale === language.value && <small>{t("Bahasa aktif")}</small>}</span>
      </button>)}</div>
    </div>
  </div>;
}

"use client";

import Image from "next/image";
import { ArrowRight, Camera, ChevronRight, Clock3, MapPin, Pause, Play, Recycle, UsersRound } from "lucide-react";
import styles from "./impact-hero.module.css";
import MobileHeroContent from "./landing/mobile-hero-content";
import HeroFeatureIcon from "./landing/hero-feature-icon";
import { useI18n } from "../lib/i18n/provider";


export default function ImpactHero({ motionPaused, onToggleMotion }: { motionPaused: boolean; onToggleMotion: () => void }) {
  const { t } = useI18n();
  return (
    <section className={styles.hero} id="beranda" aria-labelledby="impact-hero-title">
      <div className={styles.frame}>
        <span data-landing-float="shape" className={`${styles.shape} ${styles.shapeLeft}`} aria-hidden="true" />
        <span data-landing-float="shape" className={`${styles.shape} ${styles.shapeRight}`} aria-hidden="true" />
        <span data-landing-float="leaf" className={`${styles.leaf} ${styles.leafLeft}`} aria-hidden="true" />
        <span data-landing-float="leaf" className={`${styles.leaf} ${styles.leafRight}`} aria-hidden="true" />
        <svg data-landing-float="orbit" className={`${styles.orbit} ${styles.orbitLeft}`} viewBox="0 0 180 400" fill="none" aria-hidden="true"><path d="M158 8C-40 86-40 220 158 267S214 365 68 392" /></svg>
        <svg data-landing-float="orbit" className={`${styles.orbit} ${styles.orbitRight}`} viewBox="0 0 180 400" fill="none" aria-hidden="true"><path d="M22 8C220 86 220 220 22 267S-34 365 112 392" /></svg>

        <a data-landing-enter="hero-card" data-landing-float="card" data-motion="card" data-motion-action className={`${styles.card} ${styles.scanCard}`} href="/dashboard?view=scan">
          <span data-landing-artwork className={`${styles.iconTile} ${styles.cameraTile}`}><HeroFeatureIcon feature="camera" className={styles.iconArtwork} /></span>
          <span className={styles.cardCopy}><strong>{t("Scan dari foto")}</strong><span>{t("Kenali jenis material")}</span></span>
          <ChevronRight className={styles.cardArrow} size={29} aria-hidden="true" />
        </a>

        <a data-landing-enter="hero-card" data-landing-float="card" data-motion="card" data-motion-action className={`${styles.card} ${styles.bottleCard}`} href="/dashboard?view=scan" aria-label={t("Mulai scan sampah, contoh hasil: botol plastik")}>
          <span data-landing-float="scan" className={styles.bottlePhoto}><span data-landing-scan className={styles.scanLight} aria-hidden="true" /><Image src="/images/landing-hero/bottle.webp" alt="" fill sizes="(max-width: 760px) 1px, (max-width: 1200px) 180px, 12vw" /></span>
          <span className={styles.bottleCopy}><strong>{t("Botol plastik")}</strong><span>{t("Contoh hasil scan")}</span><small className={styles.material}><Recycle aria-hidden="true" />{t("Plastik")}</small></span>
        </a>

        <div data-motion="heading" className={styles.center}>
          <p data-landing-enter="eyebrow" className={styles.eyebrow}>{t("Bukti foto. Aksi lokal.")}</p>
          <h1 data-landing-enter="title" data-landing-order="1" id="impact-hero-title" aria-label={t("Kenali sampah, laporkan lokasi, pahami area.")}>
            {t("Kenali sampah,")}<br />{" "}{t("laporkan lokasi,")}<br />{" "}
            <span>{t("pahami area.")}</span>
          </h1>
          <p data-landing-enter="copy" data-landing-order="2" className={styles.description}>{t("Dari satu foto, mulai langkah yang lebih tepat")}<br className={styles.desktopBreak} /> {" "}{t("untuk lingkungan sekitar.")}</p>
          <div data-landing-enter="actions" data-landing-order="3" className={styles.actions}>
            <a data-motion-action data-landing-action className={`${styles.button} ${styles.primary}`} href="/dashboard?view=scan"><Camera aria-hidden="true" />{t("Mulai scan")}</a>
            <a data-motion-action data-landing-action className={`${styles.button} ${styles.secondary}`} href="/incidents">{t("Kejadian publik")}<ArrowRight aria-hidden="true" /></a>
          </div>
          <ul data-landing-enter="assurances" data-landing-order="4" className={styles.assurances}>
            <li><Camera aria-hidden="true" />{t("Bukti foto")}</li>
            <li><MapPin aria-hidden="true" />{t("Konteks lokasi")}</li>
            <li><UsersRound aria-hidden="true" />{t("Tinjauan manusia")}</li>
          </ul>
        </div>
        <MobileHeroContent />

        <a data-landing-enter="hero-card" data-landing-float="card" data-motion="card" data-motion-action className={`${styles.card} ${styles.reportCard}`} href="/dashboard?view=reports">
          <span className={styles.reportTop}>
            <span data-landing-artwork className={`${styles.iconTile} ${styles.reportTile}`}><HeroFeatureIcon feature="report" className={styles.iconArtwork} /></span>
            <strong>{t("Buat laporan")}</strong>
            <ChevronRight className={styles.cardArrow} size={29} aria-hidden="true" />
          </span>
          <span className={styles.reportMeta}><span><Camera aria-hidden="true" />{t("Foto")}</span><i>•</i><span><MapPin aria-hidden="true" />{t("lokasi")}</span><i>•</i><span><Clock3 aria-hidden="true" />{t("waktu")}</span></span>
        </a>

        <a data-landing-enter="hero-card" data-landing-float="card" data-motion="card" data-motion-action className={`${styles.card} ${styles.mapCard}`} href="#peta">
          <span className={styles.mapTop}>
            <span data-landing-artwork className={`${styles.iconTile} ${styles.mapTile}`}><HeroFeatureIcon feature="map" className={styles.iconArtwork} /></span>
            <span className={styles.cardCopy}><strong>{t("Peta area")}</strong><span>{t("Laporan terverifikasi")}</span></span>
            <ChevronRight className={styles.cardArrow} size={29} aria-hidden="true" />
          </span>
          <span className={styles.mapPreview}><Image src="/images/landing-hero/map-preview.webp" alt={t("Ilustrasi peta area dengan titik laporan")} fill sizes="(max-width: 760px) 1px, (max-width: 1200px) 45vw, 25vw" /></span>
        </a>
        <span className={styles.bottomRim} aria-hidden="true" />
        <button type="button" data-landing-motion-toggle className={styles.motionToggle} aria-pressed={motionPaused} onClick={onToggleMotion}>
          {motionPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          {t(motionPaused ? "Lanjutkan animasi" : "Jeda animasi")}
        </button>
      </div>
    </section>
  );
}

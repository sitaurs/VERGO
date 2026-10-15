"use client";

import Image from "next/image";
import { ArrowRight, Camera, ChevronRight, Clock3, MapPin, Recycle, UsersRound } from "lucide-react";
import styles from "./impact-hero.module.css";
import MobileHeroContent from "./landing/mobile-hero-content";
import HeroFeatureIcon from "./landing/hero-feature-icon";
import { useI18n } from "../lib/i18n/provider";


export default function ImpactHero() {
  const { t } = useI18n();
  return (
    <section className={styles.hero} id="beranda" aria-labelledby="impact-hero-title">
      <div className={styles.frame}>
        <span className={`${styles.shape} ${styles.shapeLeft}`} aria-hidden="true" />
        <span className={`${styles.shape} ${styles.shapeRight}`} aria-hidden="true" />
        <span className={`${styles.leaf} ${styles.leafLeft}`} aria-hidden="true" />
        <span className={`${styles.leaf} ${styles.leafRight}`} aria-hidden="true" />
        <svg className={`${styles.orbit} ${styles.orbitLeft}`} viewBox="0 0 180 400" fill="none" aria-hidden="true"><path d="M158 8C-40 86-40 220 158 267S214 365 68 392" /></svg>
        <svg className={`${styles.orbit} ${styles.orbitRight}`} viewBox="0 0 180 400" fill="none" aria-hidden="true"><path d="M22 8C220 86 220 220 22 267S-34 365 112 392" /></svg>

        <a data-motion="card" data-motion-action className={`${styles.card} ${styles.scanCard}`} href="/dashboard?view=scan">
          <span className={`${styles.iconTile} ${styles.cameraTile}`}><HeroFeatureIcon feature="camera" className={styles.iconArtwork} /></span>
          <span className={styles.cardCopy}><strong>{t("Scan dari foto")}</strong><span>{t("Kenali jenis material")}</span></span>
          <ChevronRight className={styles.cardArrow} size={29} aria-hidden="true" />
        </a>

        <a data-motion="card" data-motion-action className={`${styles.card} ${styles.bottleCard}`} href="/dashboard?view=scan" aria-label={t("Mulai scan sampah, contoh hasil: botol plastik")}>
          <span className={styles.bottlePhoto}><Image src="/images/landing-hero/bottle.webp" alt="" fill sizes="(max-width: 760px) 1px, (max-width: 1200px) 180px, 12vw" /></span>
          <span className={styles.bottleCopy}><strong>{t("Botol plastik")}</strong><span>{t("Contoh hasil scan")}</span><small className={styles.material}><Recycle aria-hidden="true" />{t("Plastik")}</small></span>
        </a>

        <div data-motion="heading" className={styles.center}>
          <p className={styles.eyebrow}>{t("Bukti foto. Aksi lokal.")}</p>
          <h1 id="impact-hero-title" aria-label={t("Kenali sampah, laporkan lokasi, pahami area.")}>
            {t("Kenali sampah,")}<br />{" "}{t("laporkan lokasi,")}<br />{" "}
            <span>{t("pahami area.")}</span>
          </h1>
          <p className={styles.description}>{t("Dari satu foto, mulai langkah yang lebih tepat")}<br className={styles.desktopBreak} /> {" "}{t("untuk lingkungan sekitar.")}</p>
          <div className={styles.actions}>
            <a data-motion-action className={`${styles.button} ${styles.primary}`} href="/dashboard?view=scan"><Camera aria-hidden="true" />{t("Mulai scan")}</a>
            <a data-motion-action className={`${styles.button} ${styles.secondary}`} href="/incidents">{t("Kejadian publik")}<ArrowRight aria-hidden="true" /></a>
          </div>
          <ul className={styles.assurances}>
            <li><Camera aria-hidden="true" />{t("Bukti foto")}</li>
            <li><MapPin aria-hidden="true" />{t("Konteks lokasi")}</li>
            <li><UsersRound aria-hidden="true" />{t("Tinjauan manusia")}</li>
          </ul>
        </div>
        <MobileHeroContent />

        <a data-motion="card" data-motion-action className={`${styles.card} ${styles.reportCard}`} href="/dashboard?view=reports">
          <span className={styles.reportTop}>
            <span className={`${styles.iconTile} ${styles.reportTile}`}><HeroFeatureIcon feature="report" className={styles.iconArtwork} /></span>
            <strong>{t("Buat laporan")}</strong>
            <ChevronRight className={styles.cardArrow} size={29} aria-hidden="true" />
          </span>
          <span className={styles.reportMeta}><span><Camera aria-hidden="true" />{t("Foto")}</span><i>•</i><span><MapPin aria-hidden="true" />{t("lokasi")}</span><i>•</i><span><Clock3 aria-hidden="true" />{t("waktu")}</span></span>
        </a>

        <a data-motion="card" data-motion-action className={`${styles.card} ${styles.mapCard}`} href="#peta">
          <span className={styles.mapTop}>
            <span className={`${styles.iconTile} ${styles.mapTile}`}><HeroFeatureIcon feature="map" className={styles.iconArtwork} /></span>
            <span className={styles.cardCopy}><strong>{t("Peta area")}</strong><span>{t("Laporan terverifikasi")}</span></span>
            <ChevronRight className={styles.cardArrow} size={29} aria-hidden="true" />
          </span>
          <span className={styles.mapPreview}><Image src="/images/landing-hero/map-preview.webp" alt={t("Ilustrasi peta area dengan titik laporan")} fill sizes="(max-width: 760px) 1px, (max-width: 1200px) 45vw, 25vw" /></span>
        </a>
        <span className={styles.bottomRim} aria-hidden="true" />
      </div>
    </section>
  );
}

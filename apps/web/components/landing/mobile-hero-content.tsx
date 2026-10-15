"use client";

import Image from "next/image";
import { Camera, ChevronDown, FileText, MapPin, MessageSquarePlus } from "lucide-react";
import styles from "./mobile-hero-content.module.css";
import { useI18n } from "../../lib/i18n/provider";
import HeroFeatureIcon from "./hero-feature-icon";


const features = [
  { title: "Scan dari foto", description: "Kenali jenis material", href: "/dashboard?view=scan", icon: Camera, artwork: "camera", green: false },
  { title: "Buat laporan", description: "Foto, lokasi, dan waktu", href: "/dashboard?view=reports", icon: FileText, artwork: "report", green: true },
  { title: "Kejadian publik", description: "Kirim pembaruan warga", href: "/incidents", icon: MessageSquarePlus, artwork: null, green: false },
  { title: "Peta area", description: "Laporan terverifikasi", href: "#peta", icon: MapPin, artwork: "map", green: true },
] as const;

export default function MobileHeroContent() {
  const { t } = useI18n();
  return <div className={styles.content}>
    <div data-landing-enter="card" data-motion="card" className={styles.photo}>
      <Image src="/images/landing-mobile/hero-camera.webp" alt={t("Ilustrasi memotret botol plastik dengan kamera VERGO. Contoh hasil scan: botol plastik.")} width={441} height={396} sizes="(max-width: 760px) calc(100vw - 48px), 1px" loading="eager" />
    </div>
    <p className={styles.eyebrow}>{t("Kenali fitur VERGO")}</p>
    <div className={styles.features}>
      {features.map(({ title, description, href, icon: Icon, artwork, green }) => <a data-landing-enter="card" data-landing-feature data-motion="card" data-motion-action key={title} className={styles.feature} href={href}>
        <span data-landing-artwork className={`${styles.icon} ${green ? styles.green : ""}`}>{artwork ? <HeroFeatureIcon feature={artwork} className={styles.artwork} /> : <Icon aria-hidden="true" />}</span>
        <strong>{t(title)}</strong><span className={styles.description}>{t(description)}</span>
      </a>)}
    </div>
    <a href="#cara-kerja" className={styles.learn}><ChevronDown aria-hidden="true" /><span>{t("Pelajari cara kerjanya")}</span></a>
  </div>;
}

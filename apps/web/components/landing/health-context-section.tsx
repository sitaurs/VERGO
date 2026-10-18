"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { useI18n } from "../../lib/i18n/provider";
import s from "./health-context-section.module.css";

const sources = [
  { title: "PBB — SDG 3.9", image: "sdg-reference", href: "https://sdgs.un.org/goals/goal3" },
  { title: "WHO — sampah dan kesehatan", image: "who-reference", href: "https://www.who.int/news/item/16-12-2025-who-highlights-health-risks-and-opportunities-in-the-global-waste-crisis" },
] as const;

export default function HealthContextSection() {
  const { t } = useI18n();
  return <section id="kesehatan-lingkungan" className={s.section} aria-labelledby="health-context-title">
    <div className={s.overview}>
      <div className={s.copy}>
        <span className={s.eyebrow} data-landing-enter="eyebrow">SDG 3 · {t("Target 3.9")}</span>
        <h2 id="health-context-title" className={s.title} data-landing-enter="heading"><span>{t("Lingkungan terawat,")}</span>{" "}<em>{t("kesehatan lebih terlindungi.")}</em></h2>
        <p className={s.description} data-landing-enter="copy" data-landing-order="1">{t("Sampah yang tidak dikelola dapat mencemari air, tanah, dan udara serta menjadi tempat berkembangnya pembawa penyakit. VERGO membantu warga mendokumentasikan kondisi dan memantau tindak lanjut, sejalan dengan tujuan SDG 3.9 untuk mengurangi dampak pencemaran terhadap kesehatan.")}</p>
        <p className={s.limit} data-landing-enter="card" data-landing-order="2">{t("Peta VERGO merangkum laporan warga; peta ini tidak mengukur risiko penyakit atau membuktikan penurunan penyakit.")}</p>
      </div>
      <div className={s.visual} data-landing-enter="hero-card">
        <div className={s.scene} data-landing-float="art"><Image src="/images/landing-health/environment.webp" alt={t("Ilustrasi rumah, pepohonan, dan warga membersihkan lingkungan.")} fill sizes="(max-width: 760px) 90vw, (max-width: 1100px) 46vw, 640px" /></div>
      </div>
    </div>
    <div className={s.references} aria-labelledby="health-sources-title">
      <h3 id="health-sources-title" data-landing-enter="heading">{t("Rujukan")}</h3>
      <div className={s.sourceGrid}>{sources.map(({ title, image, href }, index) => <a key={image} className={s.sourceCard} href={href} target="_blank" rel="noopener noreferrer" aria-label={t("Buka rujukan {0} di tab baru", { "0": t(title) })} data-landing-enter="card" data-landing-order={index}>
        <span className={s.sourceArtwork} data-landing-float="art"><Image src={`/images/landing-health/${image}.webp`} alt="" fill sizes="(max-width: 480px) 90px, (max-width: 760px) 140px, 210px" /></span>
        <span className={s.sourceTitle}>{t(title)}</span>
        <span className={s.externalIcon} aria-hidden="true"><ExternalLink size={24} strokeWidth={1.8} /></span>
      </a>)}</div>
    </div>
  </section>;
}

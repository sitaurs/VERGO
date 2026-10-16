"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Camera, Check, ChevronDown, Clock3, FileText, Leaf, LockKeyhole, MapPin, Recycle, ShieldCheck, UsersRound, CalendarDays } from "lucide-react";
import LandingHeader from "./landing/landing-header";
import PublicMapSection from "./public-map-section";
import BrandLogo from "./brand-logo";
import { DetailDialog, type BottomDetail } from "./lower-section";
import { useI18n } from "../lib/i18n/provider";
import { useLandingMotion } from "./landing/use-landing-motion";
import motionStyles from "./landing/landing-motion.module.css";
import s from "./landing/vergo-landing.module.css";

type ArtworkName = "hero" | "scan" | "report" | "review" | "map" | "community";
function Artwork({ name, className = "", alt = "", eager = false, sizes = "(max-width: 760px) 45vw, 280px" }: { name: ArtworkName; className?: string; alt?: string; eager?: boolean; sizes?: string }) {
  return <div className={`${s.artwork} ${className}`}><Image src={`/images/landing-25d/${name}.webp`} alt={alt} fill sizes={sizes} preload={eager} /></div>;
}
const steps = [
  { art: "scan", title: "Foto dan kenali", copy: "Kenali material sampah dari foto." },
  { art: "report", title: "Laporkan kondisi", copy: "Lengkapi lokasi, waktu, dan catatan kondisi." },
  { art: "review", title: "Ditinjau manusia", copy: "Moderator memeriksa sebelum laporan tampil publik." },
] as const;
const features = [
  { art: "scan", title: "Kenali material sampah", copy: "AI membantu mengenali jenis material dari foto.", href: "/dashboard?view=scan" },
  { art: "report", title: "Pelaporan yang terarah", copy: "Lengkapi foto, lokasi, waktu, dan catatan kondisi.", href: "/dashboard?view=reports" },
  { art: "map", title: "Peta area terverifikasi", copy: "Lihat ringkasan laporan yang sudah ditinjau.", href: "#peta" },
  { art: null, title: "Pantau pembaruan", copy: "Ikuti perkembangan laporan Anda.", href: "/dashboard?view=notifications" },
] as const;
const verification = [
  { art: "report", title: "Laporan dikirim", copy: "Foto dan konteks lokasi dikirim oleh pengguna." },
  { art: "review", title: "Moderator memeriksa", copy: "Bukti diperiksa sebelum diputuskan." },
  { art: "map", title: "Area tampil di peta", copy: "Laporan yang disetujui masuk ke ringkasan publik." },
] as const;
const questions = [
  { title: "Apakah hasil AI langsung terverifikasi?", answer: "Tidak. AI membantu mengenali material, sedangkan laporan diperiksa moderator sebelum masuk ke ringkasan publik." },
  { title: "Apakah foto dan lokasi saya langsung tampil?", answer: "Tidak. Foto dan koordinat presisi tidak otomatis ditampilkan. Peta publik menampilkan ringkasan per area; publikasi bukti mengikuti persetujuan dan pemeriksaan yang berlaku." },
  { title: "Bagaimana laporan muncul di peta?", answer: "Setelah diperiksa dan disetujui moderator, laporan masuk ke ringkasan area sesuai lokasi dan periode yang dipilih." },
] as const;
function StatusTimeline({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return <ol className={`${s.timeline} ${compact ? s.compactTimeline : ""}`} aria-label={t("Contoh status laporan")}>
    {[
      { icon: Check, title: "Laporan dikirim", copy: "Bukti dan konteks telah dilengkapi.", state: "done" },
      { icon: Clock3, title: "Menunggu tinjauan", copy: "Dalam pemeriksaan moderator.", state: "pending" },
      { icon: MapPin, title: "Tampil di peta", copy: "Setelah disetujui.", state: "future" },
    ].map(({ icon: Icon, title, copy, state }) => <li key={title} data-state={state}><span className={s.statusIcon}><Icon size={16} aria-hidden="true" /></span><div><strong>{t(title)}</strong>{!compact && <small>{t(copy)}</small>}</div></li>)}
  </ol>;
}
function ReportPreview() {
  const { t } = useI18n();
  return <div className={s.preview} data-landing-enter="card" aria-label={t("Contoh alur laporan")}>
    <div className={s.previewSidebar}><BrandLogo width={110} /><a href="/dashboard?view=scan"><Camera size={17} />{t("Scan")}</a><a href="/dashboard?view=reports"><FileText size={17} />{t("Laporan saya")}</a><a href="#peta"><MapPin size={17} />{t("Peta area")}</a><a href="/incidents"><ShieldCheck size={17} />{t("Kejadian publik")}</a></div>
    <div className={s.previewScan}><Artwork name="scan" sizes="(max-width: 760px) 180px, 320px" /><span className={s.material}><Recycle size={14} />{t("Botol plastik")}</span></div>
    <div className={s.previewReport}><span className={s.example}>{t("Contoh alur laporan")}</span><h3>{t("Buat laporan")}</h3><dl><div><dt><MapPin size={14} />{t("Lokasi")}</dt><dd>Malang</dd></div><div><dt><FileText size={14} />{t("Catatan")}</dt><dd>{t("Contoh: botol plastik di pinggir jalan.")}</dd></div></dl><a className={s.textLink} href="/dashboard?view=reports">{t("Mulai laporan")}<ArrowRight size={16} /></a></div>
    <div className={s.previewStatus}><h3>{t("Status laporan")}</h3><StatusTimeline /></div>
  </div>;
}
export default function LandingPage() {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [bottomDetail, setBottomDetail] = useState<BottomDetail | null>(null);
  useLandingMotion(rootRef, false);
  return <div ref={rootRef} data-motion-ignore data-landing-motion className={`${s.root} ${motionStyles.root}`}>
    <a className="skip-link" href="#beranda">{t("Lewati navigasi")}</a><LandingHeader />
    <main>
      <section id="beranda" className={s.hero} aria-labelledby="impact-hero-title"><div className={`${s.container} ${s.heroInner}`}>
        <div className={s.heroCopy}><p data-landing-enter="eyebrow" className={s.eyebrow}>{t("Foto. Verifikasi. Aksi.")}</p>
          <h1 id="impact-hero-title" data-landing-enter="title" data-landing-order="1"><span>{t("Satu foto.")}</span><span>{t("Bukti yang jelas.")}</span><em>{t("Aksi yang tepat.")}</em></h1>
          <p data-landing-enter="copy" data-landing-order="2" className={s.heroDescription}>{t("Kenali sampah dengan AI, petakan lokasinya, dan ikuti laporan yang ditinjau manusia.")}</p>
          <div className={s.heroActions} data-landing-enter="actions" data-landing-order="3"><a className={s.primary} data-landing-action href="/dashboard?view=scan"><Camera size={21} />{t("Mulai scan")}<ArrowRight size={19} /></a><a className={s.secondary} data-landing-action href="#peta">{t("Jelajahi peta")}<ArrowRight size={19} /></a></div>
          <ul className={s.assurances} data-landing-enter="assurances" data-landing-order="4"><li><Camera />{t("Bukti foto")}</li><li><MapPin />{t("Konteks lokasi")}</li><li><UsersRound />{t("Tinjauan manusia")}</li></ul><a className={s.incidentLink} href="/incidents">{t("Kejadian publik")}<ArrowRight size={15} /></a>
        </div>
        <div className={s.heroVisual} data-landing-enter="hero-card"><div data-landing-float="shape"><Artwork name="hero" alt={t("Ilustrasi foto sampah, konteks lokasi, dan pemeriksaan manusia di VERGO")} eager className={s.heroArtwork} sizes="(max-width: 760px) 100vw, (max-width: 1200px) 55vw, 780px" /></div></div>
      </div></section>
      <section id="cara-kerja" className={`${s.section} ${s.container}`} aria-labelledby="workflow-title">
        <div className={`${s.heading} ${s.centered}`} data-landing-enter="heading"><span className={s.pill}>{t("Cara kerja")}</span><h2 id="workflow-title">{t("Lihat masalahnya.")} <em>{t("Tentukan langkahnya.")}</em></h2></div>
        <ol className={s.steps}>{steps.map((step, index) => <li key={step.title} data-landing-enter="card" data-landing-order={index}><Artwork name={step.art} /><div><span className={s.stepNumber}>0{index + 1}</span><h3>{t(step.title)}</h3><p>{t(step.copy)}</p></div>{index < steps.length - 1 && <ArrowRight className={s.stepArrow} aria-hidden="true" />}</li>)}</ol><ReportPreview />
      </section>
      <section id="fitur" className={s.featuresSection} aria-labelledby="features-title"><div className={s.container}>
        <div className={s.heading} data-landing-enter="heading"><span className={s.pill}>{t("Fitur VERGO")}</span><h2 id="features-title">{t("Dari bukti kecil,")} <em>{t("gambaran yang lebih utuh.")}</em></h2></div>
        <div className={s.features}>{features.map((feature, index) => <a key={feature.title} href={feature.href} className={s.feature} data-landing-feature data-landing-enter="card" data-landing-order={index}><div className={s.featureCopy}><span className={s.featureNumber}>0{index + 1}</span><h3>{t(feature.title)}</h3><p>{t(feature.copy)}</p><span className={s.featureArrow}><ArrowRight size={20} aria-hidden="true" /></span></div>{feature.art ? <Artwork name={feature.art} /> : <div className={s.timelineVisual}><StatusTimeline compact /><span className={s.example}>{t("Contoh status")}</span></div>}</a>)}</div>
      </div></section>
      <PublicMapSection />
      <section id="verifikasi" className={`${s.section} ${s.container}`} aria-labelledby="verification-title"><span id="tinjauan" className={s.anchor} />
        <div className={s.heading} data-landing-enter="heading"><span className={s.pill}>{t("Verifikasi")}</span><h2 id="verification-title">{t("AI membantu.")} <em>{t("Manusia memastikan.")}</em></h2><p>{t("Laporan diperiksa moderator sebelum tampil di peta publik.")}</p></div>
        <ol className={s.verificationSteps}>{verification.map((step, index) => <li key={step.title} data-landing-enter="card" data-landing-order={index}><span className={s.featureNumber}>0{index + 1}</span><Artwork name={step.art} sizes="(max-width: 760px) 120px, 150px" /><div><h3>{t(step.title)}</h3><p>{t(step.copy)}</p></div></li>)}</ol><p className={s.privacy}><LockKeyhole size={17} aria-hidden="true" />{t("Foto dan koordinat tidak langsung ditampilkan ke publik.")}</p>
      </section>
      <section id="aksi-warga" className={`${s.section} ${s.communitySection}`} aria-labelledby="community-title"><div className={s.container}>
        <div className={s.heading} data-landing-enter="heading"><span className={s.pill}>{t("Aksi bersama")}</span><h2 id="community-title">{t("Dari laporan,")} <em>{t("menjadi aksi bersama.")}</em></h2><p>{t("Bantu lingkungan sekitar melalui bukti dan kegiatan warga.")}</p></div>
        <div className={s.communityGrid}><Artwork name="community" className={s.communityArtwork} alt={t("Ilustrasi warga membersihkan lingkungan bersama")} sizes="(max-width: 760px) 100vw, 460px" /><div className={s.communityLinks}><a href="/activities" className={s.communityCard} data-landing-enter="card"><span className={s.communityIcon}><CalendarDays /></span><div><h3>{t("Kegiatan warga")}</h3><p>{t("Temukan kegiatan bersih lingkungan.")}</p><span className={s.textLink}>{t("Lihat kegiatan warga")}<ArrowRight size={17} /></span></div></a><a href="/incidents" className={s.communityCard} data-landing-enter="card" data-landing-order="1"><span className={s.communityIcon}><Leaf /></span><div><h3>{t("Pembaruan kondisi")}</h3><p>{t("Ikuti pembaruan pada kejadian publik yang telah ditinjau.")}</p><span className={s.textLink}>{t("Lihat kejadian publik")}<ArrowRight size={17} /></span></div></a></div></div>
      </div></section>
      <section id="edukasi" className={`${s.section} ${s.container} ${s.faq}`} aria-labelledby="faq-title"><div className={s.heading} data-landing-enter="heading"><span className={s.pill}>FAQ</span><h2 id="faq-title">{t("Yang sering ditanyakan.")}</h2><p>{t("Kenali cara kerja dan privasi laporan Anda.")}</p></div><div className={s.questions}>{questions.map((question, index) => <details key={question.title} name="vergo-landing-faq" open={index === 0}><summary>{t(question.title)}<ChevronDown size={19} aria-hidden="true" /></summary><p>{t(question.answer)}</p></details>)}</div></section>
      <section className={`${s.container} ${s.closing}`} aria-labelledby="closing-title"><div><h2 id="closing-title">{t("Mulai dari satu foto.")}</h2><p>{t("Ambil langkah kecil untuk lingkungan yang lebih baik.")}</p></div><a className={s.primary} data-landing-action href="/dashboard?view=scan"><Camera size={21} />{t("Mulai scan sekarang")}<ArrowRight size={20} /></a><Artwork name="scan" className={s.closingArtwork} /></section>
    </main>
    <footer className={s.footer}><div className={`${s.container} ${s.footerGrid}`}><div className={s.footerBrand}><a href="#beranda" aria-label={t("VERGO, kembali ke beranda")}><BrandLogo width={148} /></a><p>{t("Kenali sampah, laporkan kondisi, dan pantau lingkungan bersama.")}</p></div><nav aria-label={t("Navigasi footer")}><div><h3>{t("Produk")}</h3><a href="/dashboard?view=scan">{t("Scan")}</a><a href="#peta">{t("Peta Laporan")}</a><a href="/incidents">{t("Kejadian publik")}</a><a href="/activities">{t("Kegiatan warga")}</a></div><div><h3>{t("Tentang")}</h3><a href="#cara-kerja">{t("Cara kerja")}</a><a href="#verifikasi">{t("Verifikasi")}</a><a href="#edukasi">{t("Edukasi")}</a></div><div><h3>{t("Bantuan")}</h3>{["Kebijakan Privasi", "Ketentuan Layanan", "Pengaturan Cookie"].map(label => <button type="button" key={label} onClick={() => setBottomDetail({ kind: "footer", label })}>{t(label)}</button>)}</div></nav><div className={s.footerBottom}><span>© {new Date().getFullYear()} VERGO</span><a href="/dashboard">{t("Buka dashboard")}<ArrowRight size={16} /></a><span>Verify and Go</span></div></div></footer>
    <DetailDialog detail={bottomDetail} onClose={() => setBottomDetail(null)} />
  </div>;
}

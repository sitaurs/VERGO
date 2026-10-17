"use client";

import Image from "next/image";
import { useRef } from "react";
import { ArrowRight, BadgeCheck, Camera, ChevronDown, Layers2, Leaf, MapPin, RefreshCw, ScanLine, Sparkles, UsersRound } from "lucide-react";
import { useI18n } from "../../lib/i18n/provider";
import { useFaqMotion } from "./use-faq-motion";
import s from "./landing-faq.module.css";

const questions = [
  { icon: ScanLine, title: "Apakah hasil AI langsung terverifikasi?", answer: "Tidak. AI membantu mengenali material, sedangkan laporan diperiksa moderator sebelum masuk ke ringkasan publik." },
  { icon: Camera, title: "Apakah foto dan lokasi saya langsung tampil?", answer: "Tidak. Foto dan koordinat presisi tidak otomatis ditampilkan. Peta publik menampilkan ringkasan per area; publikasi bukti mengikuti persetujuan dan pemeriksaan yang berlaku." },
  { icon: MapPin, title: "Bagaimana laporan muncul di peta?", answer: "Setelah diperiksa dan disetujui moderator, laporan masuk ke ringkasan area sesuai lokasi dan periode yang dipilih." },
  { icon: BadgeCheck, title: "Apa arti Terverifikasi moderator?", answer: "Bukti dan konteks laporan telah diperiksa. Kondisi dapat berubah; lihat waktu pembaruan. Status ini tidak menjamin semua dugaan benar atau sampah sudah dibersihkan." },
  { icon: Layers2, title: "Apakah area tanpa laporan berarti bersih?", answer: "Belum ada laporan terverifikasi pada periode ini berarti data belum tersedia, bukan bukti area bersih. Warna peta merangkum kejadian yang dilaporkan, bukan tingkat risiko penyakit." },
  { icon: RefreshCw, title: "Bagaimana jika laporan keliru atau lokasi sudah bersih?", answer: "Buka kejadian publik, lalu pilih Perbarui kondisi atau Laporkan informasi keliru. Masuk bila diminta dan sertakan waktu pengamatan serta bukti yang relevan. Moderator memeriksa pembaruan sebelum kondisi berubah; jumlah dukungan tidak menentukan kebenaran." },
  { icon: UsersRound, title: "Siapa yang menangani laporan?", answer: "Moderator memeriksa laporan dan penanggung jawab yang ditugaskan mencatat tindak lanjut. Pengiriman laporan tidak menjamin penanganan langsung. Jika belum ada pelaksana, laporan belum mempunyai penanggung jawab." },
] as const;

export default function LandingFaq() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  useFaqMotion(sectionRef);

  return (
    <section ref={sectionRef} id="edukasi" className={s.faq} aria-labelledby="faq-title">
      <div className={s.intro} data-landing-enter="heading">
        <span className={s.eyebrow}>FAQ</span>
        <h2 id="faq-title" className={s.title}>{t("Yang sering ditanyakan.")}</h2>
        <p className={s.description}>{t("Kenali cara kerja dan privasi laporan Anda.")}</p>
        <div className={s.scene} aria-hidden="true">
          <span className={s.aura} data-landing-float="orbit" />
          <span className={s.orbit} />
          <span className={`${s.spark} ${s.sparkOne}`} data-landing-float="token"><Sparkles size={21} strokeWidth={1.5} /></span>
          <span className={`${s.spark} ${s.sparkTwo}`} data-landing-float="token"><Leaf size={24} strokeWidth={1.6} /></span>
          <span className={s.dot} data-landing-float="token" />
          <div className={s.illustrationMotion} data-landing-float="faq" data-landing-faq-react>
            <Image
              className={s.illustration}
              src="/images/landing-25d/faq-illustration.webp"
              alt=""
              width={1200}
              height={800}
              sizes="(max-width: 760px) 280px, (max-width: 1100px) 36vw, 480px"
            />
          </div>
        </div>
        <a className={s.workflowLink} href="#cara-kerja">
          {t("Pelajari alur laporan")}<ArrowRight size={20} aria-hidden="true" />
        </a>
      </div>
      <div className={s.questions}>
        {questions.map(({ icon: Icon, title, answer }, index) => (
          <details key={title} className={s.item} name="vergo-landing-faq" open={index === 0} data-landing-faq-item data-landing-enter="faq" data-landing-order={index}>
            <summary className={s.question}>
              <span className={s.topicIcon} data-landing-faq-icon aria-hidden="true"><Icon size={25} strokeWidth={1.8} /></span>
              <span className={s.questionText}>{t(title)}</span>
              <span className={s.chevron} aria-hidden="true"><ChevronDown size={19} /></span>
            </summary>
            <p className={s.answer} data-landing-faq-answer>{t(answer)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

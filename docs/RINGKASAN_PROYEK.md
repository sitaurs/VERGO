# Ringkasan VERGO dan keputusan implementasi

Diperbarui **17 Oktober 2026**. Fitur trust UX ada pada commit `a0687b5`, sudah di-push ke `main` dan di-deploy ke VPS `srv3`. Migration ledger produksi berakhir di `0023_report_appeals_and_trust`; readiness pascadeploy melaporkan database, Redis, dan object storage `ok`.

Dokumen ini menggantikan rencana selesai, handoff lama, riset rancangan dan laporan status bertanggal yang telah dikonsolidasikan. Keberadaan kode dibedakan dari bukti integrasi serta keadaan deployment. `npm run check`, build web produksi, dan tes API relevan lulus di lokal. Pascadeploy, homepage HTTP memberi 200 dan readiness API lulus; penerimaan alur visual browser tetap menunggu QA agent pengguna.

### Tindak lanjut QA Instagram, 17 Oktober 2026

Laporan uji `f388e2a7` diperiksa lewat SSH `srv3`: rendition sudah `ready` pada 20.49 WIB, template VERGO v5, error kosong, approval invalidated, belum dipublikasikan. Kegagalan `MAP_PROVIDER_UNAVAILABLE` sebelumnya tidak dapat direproduksi dari keadaan tersimpan ini; penyebab gangguan provider belum terbukti. Endpoint publik memberikan 404 karena sumber berlabel QA, sesuai pengecualian data sintetis.

Celah yang ditemukan: worker pembuat draf otomatis belum menerapkan pengecualian QA yang sudah ada pada feed dan pemilihan sumber manual. Perbaikan menyamakan penanda QA pada worker, menolak sumber QA di gerbang render/publish dan API persetujuan/edit/delivery, serta mengganti tautan/QR draf QA dengan penjelasan pengujian internal. Draf lama tetap dapat diperiksa lewat moderasi dan dibatalkan oleh admin. Perbaikan ini tidak memerintahkan publish/retract Instagram atau mengubah keputusan laporan.

## 1. Produk dan identitas

**VERGO — Verify and Go**, dengan asisten **VERA**, menghubungkan pengenalan material sampah, laporan berlokasi, pemeriksaan manusia, informasi publik dan tindak lanjut warga.

- Repository: [sitaurs/VERGO](https://github.com/sitaurs/VERGO).
- Origin kanonik pada `deploy/compose.yml`: `https://vergo.venlab.tech`. Konfigurasi ini bukan bukti pemeriksaan DNS/TLS atau runtime pada pekerjaan dokumentasi ini.
- Identifier `@sap/*`, `SAP_*`, `SAPA_*`, `sapaEnabled`, cookie, queue, migration serta path `/etc/sap/` dipertahankan untuk kompatibilitas.
- VERGO dibangun ulang dengan EcoLens sebagai referensi dan model inferensi. Provenance serta batas reuse ada di [SOURCE_AUDIT.md](SOURCE_AUDIT.md).
- Fokus lomba: **SDG 3, terutama target 3.9**. Satu backlog aktif ada di [RENCANA_ITASE_2026.md](RENCANA_ITASE_2026.md).

## 2. Implementasi yang tersedia di source

| Area | Kemampuan dan batasnya |
| --- | --- |
| Akun | Registrasi/verifikasi email, sesi/CSRF, reset/ganti password, MFA, avatar, preferensi dan penghapusan akun. Delivery email dan acceptance lintas alur memerlukan bukti per lingkungan. |
| Scan | Kamera/unggah, job asinkron, Gradio, hybrid vision opsional, riwayat dan pengaturan admin. Klasifikasi material tidak memverifikasi kejadian. |
| Laporan | Foto privat, lokasi/waktu, perkiraan tingkat tumpukan, sumber pengamatan langsung/pihak lain, pemisahan pengamatan dan dugaan, konteks, revisi, moderasi, canonical/duplicate, timeline dan resolusi berbukti. Laporan dapat dibuat tanpa scan. Jika foto tidak aman diambil, laporan dapat dikirim privat dengan alasan keselamatan; verifikasi menunggu bukti aman. Tidak ada selfie wajib. |
| Peta | Agregasi H3 dari laporan eligible. Landing memakai Mapbox 2D/3D dengan fallback Leaflet; dashboard memakai Leaflet. Ringkasan historis bukan prediksi atau peta penyakit. |
| Kejadian publik | `/incidents` dan `/incidents/[id]`, ringkasan teredaksi, rendition berizin, timeline, dukungan/follow, konteks jumlah/waktu pembaruan, koreksi terbaru yang disetujui, dan progres penugasan aman. “Terverifikasi moderator” tidak membuktikan semua dugaan benar atau lokasi sudah bersih; tanpa data bukan berarti aman. |
| Koreksi dan banding | Form mendukung kondisi berubah dan `information_wrong`, waktu, deskripsi, 0–3 foto, consent dan revisi. Pemilik dapat meminta banding, melengkapi bukti, dan melihat progres. Kiriman/keputusan menunggu moderator, bukan jumlah suara. |
| Kegiatan | Jelajah/detail, pendaftaran, penerimaan koordinator, peserta/kehadiran, jadwal, hasil partial/complete dan bukti sebelum/sesudah. Approval hasil tidak otomatis menyelesaikan laporan. |
| Operasi | Penugasan laporan, tenggat/progres, notifikasi, pengguna/peran dan peta laporan menunggu. Progres tugas berbeda dari status laporan. |
| Dampak | Hasil disetujui, kehadiran, pengukuran berat per tahap/batch, cakupan bukti dan respons. Tidak diketahui berbeda dari nol; satu batch tidak dihitung berulang. |
| Hermes | Rekomendasi terstruktur dari service privat; keputusan verifikasi, koreksi dan resolusi tetap manusia. |
| Instagram | Consent per kanal, rendition, draft, final preview, approval, publish/retract dan rekonsiliasi persisten. Poster/caption membawa tautan kanonik/QR; perubahan sumber memberi peringatan admin. Verified bukan perintah langsung publish; HTTP 202 bukan konfirmasi terbit/terhapus dan konten Instagram lama tidak berubah otomatis. |
| VERA | Bantuan opsional, FAQ/retrieval dan query tools dengan scope server. Tidak mempunyai write/moderation/publication tools. |
| UI/bahasa | Indonesia/English, navigasi mobile, dialog/notifikasi, ilustrasi dan landing VERGO 2.5D. Preferensi bahasa tersimpan pada browser, bukan akun lintas perangkat. |

Acuan source: `apps/web/components/dashboard.tsx`, `mobile/navigation-data.ts`, `community/condition-form.tsx`, `activities/activity-result-form.tsx`, `operations/`, `impact/`, `instagram/`, `apps/api/src/`, dan `apps/worker/src/`.

## 3. Navigasi dan workflow terkini

Warga membaca peta/kejadian publik tanpa login. Kontribusi mengikuti kebutuhan akun/verifikasi email dari backend. Pelapor mengirim foto, lokasi, waktu dan konteks secara privat, memantau keputusan/permintaan bukti, lalu mengirim pembaruan atau mengikuti kegiatan. Koordinator mempunyai izin relasional untuk kegiatan yang ditugaskan kepadanya.

Admin membaca bukti/saran Hermes → meminta bukti atau verify/reject/duplicate → membuat ringkasan aman → menugaskan tindak lanjut → meninjau pembaruan/hasil → memutuskan resolusi berbukti → memperbarui publikasi bila relevan.

Menu admin di source saat audit: **Moderasi laporan, Penugasan & SLA, Peta laporan menunggu, Pengguna & peran, Komunitas & Hermes, Kegiatan relawan, Dampak, Pengaturan scan, Publikasi Instagram**. Notifikasi dan Tugas laporan sudah mempunyai menu pengguna.

**Koreksi catatan lama:** `view=community` tetap diarahkan ke Dashboard dan `admin-reviews` ke Moderasi laporan. Namun `admin-community` sekarang menjadi menu **Komunitas & Hermes**. Handoff 5–6 Oktober yang menyebut menu tersebut tidak tersedia bukan inventaris UI terkini.

Backend: browser → proxy satu origin `/api/v1` → validasi/guard sesi dan izin → service/transaksi PostgreSQL → outbox/Redis/BullMQ → worker/provider → hasil tersimpan → proyeksi publik dan notifikasi sesuai izin. AI offline tidak boleh menutup pemeriksaan manual.

## 4. Keputusan domain yang tetap berlaku

1. Status laporan `submitted/verified/in_progress/resolved/rejected/duplicate` berbeda dari visibility, review AI, consent, kegiatan, tugas dan publikasi.
2. Hasil AI, jumlah dukungan, progres tugas dan approval hasil kegiatan bukan keputusan otomatis atas kebenaran atau kebersihan lokasi.
3. Hanya laporan canonical eligible dihitung di peta. Dukungan/follow tidak menaikkan tingkat area atau memberi poin.
4. H3 mengikuti [HOTSPOT_RULES.md](HOTSPOT_RULES.md): resolution 9, tanggal Jakarta, deduplikasi, periode dan versi metode. Resolved tetap masuk hitungan historis, sedangkan jumlah terbuka dihitung terpisah.
5. Original foto, GPS presisi, identitas dan catatan internal bukan data publik. Foto publik memerlukan consent owner, approval reviewer dan rendition yang sesuai.
6. Approval Instagram terikat revisi sumber/konten/aset; perubahan membatalkan approval lama. Publish/retract menunggu konfirmasi operasi/provider.
7. Hasil partial tidak menyelesaikan laporan. Claim resolusi terikat laporan/revisi dan dapat dicabut atau diganti ketika sumber/izin/bukti berubah.
8. Retry idempoten dan konflik revisi mempertahankan input. Fixture, health probe dan mock tidak dianggap data nyata atau bukti integrasi penuh.
9. Poin, status, kapasitas, agregat dan otorisasi dihitung server. Angka dampak harus dapat ditelusuri ke catatan/metode.
10. Selfie tidak diwajibkan. Alur tanpa foto hanya untuk alasan keselamatan, tetap privat, dan menunggu bukti aman sebelum verifikasi. Pengaturan operator/kontak/catatan layanan bersifat opsional dan kosong secara default; belum ada PIC, SLA, atau retensi yang dijanjikan.

## 5. Detail penting dari rencana selesai

**Hybrid scan:** `full_ml`, `unknown_only`, `unknown_plus_threshold`, `full_llm`; singleton DB `scan_settings` menjadi konfigurasi runtime dan env menyemai default. Vision yang gagal kembali ke ML, termasuk memanggil ML pada fallback full-LLM. Kegagalan ML sendiri tetap error, bukan no-waste palsu. Panduan dipelihara di [ML_INTEGRATION.md](ML_INTEGRATION.md).

**Bahasa/form:** locale memakai `sap.locale.v1` dan cookie `sap_locale`; identifier/payload tidak diterjemahkan. Draf pembaruan menyimpan teks, waktu, ID media, revisi dan consent selama sesi browser, tanpa token, signed URL atau byte gambar. File yang belum diunggah perlu dipilih ulang setelah form dimuat kembali.

**Poster/dampak:** bukti harus berizin dan peta memakai area nyata dengan atribusi, tanpa fallback gambar kejadian rekaan. Acuan dipelihara di [INSTAGRAM_POST_DESIGN.md](INSTAGRAM_POST_DESIGN.md). Dampak tidak memakai multiplier jumlah scan; batch/tahap, koreksi, coverage dan null/nol mengikuti kontrak extension.

## 6. Bukti historis dan batasnya

| Tanggal sumber | Catatan historis | Batas kepastian |
| --- | --- | --- |
| 24–25 September | Audit EcoLens, Gradio discovery/Basic Auth dan inferensi dasar. | Provenance/snapshot; bukan evaluasi akurasi terkini. |
| 28 September | Hybrid/panel admin diimplementasikan, pemeriksaan lokal lulus saat itu. | Angka tes lama bukan hasil pemeriksaan revisi sekarang. |
| 4 Oktober | Layanan/route probe, satu inferensi sintetis dan Hermes provider smoke. | Konektivitas saat itu; bukan workflow penuh. |
| 4 Oktober | Acceptance domain komunitas memakai PostgreSQL test/demo, Hermes fixture dan storage stub. | Bukan provider-live atau frontend-production E2E; hanya skenario yang dicatat. |
| 4–6 Oktober | Perbaikan OTP/MFA, Redis fallback, media, notifikasi, mobile, bahasa dan integrasi frontend. | Perubahan kode dan handoff; deployment/acceptance dibaca per bukti asal. |
| 5 Oktober | Tes browser dengan jaringan sintetis dan QA poster lokal. | Tidak memublikasikan/menghapus Meta nyata; mendahului perubahan UI berikutnya. |
| 16–17 Oktober | Source/commit memuat VERGO/VERA, origin kanonik, landing 2.5D dan perapian tampilannya. | Draft rebrand yang masih menyebut nama/domain sebagai kandidat telah digantikan source/config. Penerimaan live terpisah. |

Persentase kesiapan **21%**, jumlah tes/route, kondisi provider down, dan path mesin lama tidak dijadikan status terkini. Source memuat migration sampai `0023_report_appeals_and_trust.sql`; ledger tiap lingkungan menentukan migration yang benar-benar terpasang.

## 7. Pekerjaan terbuka yang diteruskan

Ini kebutuhan rekonsiliasi bukti, bukan kesimpulan bahwa kode belum dibuat. ID historis dipertahankan untuk penelusuran. Backlog aktif berada di [gerbang rilis](RENCANA_ITASE_2026.md#gerbang-rilis).

| Kelompok / ID lama | Bukti atau keputusan yang perlu dituntaskan |
| --- | --- |
| Kontrak/environment G-09–11 | Schema/handler/fixture/types, published vs draft, migration checksum, flags dan commit deployment selaras. Compatibility input dan addendum kini menjaga operasi/field R1 existing saat regenerasi; tinjau lagi pada perubahan kontrak berikutnya. |
| ML/scan G-12–14 | Identitas model, kategori/unknown/no-waste, scan sampai ledger, retry/restart/outbox/lease, latensi/biaya. Outbox/lease sudah ada di source; klaim lama “belum tersedia” perlu diperiksa ulang. |
| Akun/media G-15–19/G-26 | Delivery email, OTP/reset/MFA/session/avatar, ownership, expiry dan lifecycle storage. |
| Operasi G-20–21 | Restore terisolasi dengan replay penghapusan setelah snapshot, heartbeat/queue health, kapasitas, retensi, PIC/escalation. |
| VERA G-22–25 | Korpus bersumber/reviewed, evaluasi Indonesia, abstention/sitasi, scope tools, injection, biaya/retensi dan provider gagal. |
| Support/peserta G-27/G-32 | Domain tertentu pernah lulus; deploy/UI/concurrency lingkungan sasaran tetap perlu bukti tersendiri. |
| Pembaruan/review G-28–30 | Reject/request-evidence/revisi, stale snapshot, consent, cache publik, canonical/withdrawal, konflik/replay. |
| Kegiatan/dampak G-31/G-33–35/G-47 | Lifecycle lengkap, bukti sah, revoke claim, koreksi/anti-double-count berat, poin/cap/kompensasi. |
| Notifikasi G-36 | Penerima berhak, dedup/read-state, tujuan tautan aman, update/follower/withdrawal. |
| Hermes G-37–39 | Task sampai review tersimpan, isolasi/fallback, invalid/timeout/stale/retry, kualitas/biaya. |
| Instagram G-40–46 | Consent/rendition, sumber draft, render, token/scope, publish/retract/reconciliation dan callback provider. |
| Discovery B-03/B-04 | Cocokkan discovery ID hasil privat koordinator dan eligible asset resolusi dengan source terbaru; jangan mengarang ID atau foto pengganti. |
| Data pilot Malang | Izin/sumber/tanggal/lokasi memadai; TPS/fasilitas bukan bukti insiden. Data demo berlabel dan kemitraan tidak diklaim tanpa kesepakatan. |

## 8. Dokumen yang dikonsolidasikan

| Dokumen lama | Pengganti |
| --- | --- |
| `contract.md` | Ringkasan ini dan riwayat Git. |
| `PLAN.md`, `ROADMAP.md`, `TASKS.md` | Satu rencana ITASE aktif. |
| `BACKEND_EXECUTION_PLAN.md`, `BACKEND_HANDOFF.md` | Kontrak extension, panduan teknis dan gerbang rilis aktif. |
| `BACKEND_IMPLEMENTATION_STATUS.md`, `ENVIRONMENT_READINESS.md`, `PRODUCTION_BACKEND_TODO.md`, `PRODUCTION_BACKEND_TEST_REPORT_2026-10-04.md` | Bukti historis dan pekerjaan terbuka di atas. |
| `DESIGN-UI-UX.md`, `FRONTEND_HANDOFF.md`, `FRONTEND_R1_HANDOFF.md`, `FRONTEND_R1_VERIFICATION.md` | Inventaris/alur terkini dan batas bukti di atas. |
| `FRONTEND_ACTIVITIES_IMPLEMENTATION.md`, `FRONTEND_IMPACT_IMPLEMENTATION.md`, `FRONTEND_I18N.md`, `FRONTEND_LANDING_MOBILE.md`, `FRONTEND_MOBILE_NAVIGATION.md` | Ringkasan implementasi dan detail penting di atas. |
| `HYBRID_SCAN_DETECTION.md` | Ringkasan dan panduan ML aktif. Nama lama dalam komentar kode/migration adalah rujukan historis. |
| `SAP_FEATURE_PLAN.md` | Keputusan akun/VERA/data pilot, panduan VERA dan rencana aktif. |
| Dua riset `research/2026-10-03-*.md` | Aturan domain, kontrak extension dan rencana aktif. |
| `superpowers/specs/2026-10-16-vergo-rebrand-design.md` | Keputusan merek/origin/kompatibilitas di atas; draft lokal belum terlacak Git telah diringkas. |

Salinan tracked sebelum konsolidasi: `git show 413100b949f0a8f42679b4a8fd42c1b7e95976e1:docs/NAMA_DOKUMEN.md`; changelog root memakai `:contract.md`. Draft rebrand lokal tidak ada pada commit itu.

## 9. Acuan tetap

[Indeks](README.md) · [PRD](PRD.md) · [Kontrak extension](CONTRACT_ZAKA_ZAMANI.md) · [Deployment](DEPLOYMENT.md) · [Moderasi](CONTENT_OPERATIONS.md) · [Rencana aktif](RENCANA_ITASE_2026.md).

Riset lama mengacu [Hermes](https://github.com/NousResearch/hermes-agent), [Meta Instagram Platform](https://developers.facebook.com/documentation/instagram-platform/overview) dan [lisensi OSM](https://www.openstreetmap.org/copyright). Kemampuan/scope provider diperiksa kembali saat integrasi aktual.

# Rencana VERGO untuk ITASE 7.0 dan kepercayaan laporan

Tanggal **17 Oktober 2026**. **Status: rencana aktif, belum dieksekusi oleh perubahan dokumentasi ini.** Baseline source `413100b`. Kemampuan existing dan batas bukti: [RINGKASAN_PROYEK.md](RINGKASAN_PROYEK.md).

## 1. Tujuan dan keputusan produk

VERGO membantu warga melaporkan penumpukan sampah yang berpotensi mengganggu kesehatan, memeriksa buktinya, dan memantau penanganan sampai kondisi diperbarui. Fokus kompetisi **SDG 3, terutama target 3.9**; edukasi mendukungnya. Kontribusi pada pekerjaan/pendapatan tidak dijadikan fokus utama tanpa bukti.

Empat pertanyaan yang harus terjawab: **Apa yang dilaporkan? Seberapa baru buktinya? Siapa yang menindaklanjuti? Bagaimana jika informasinya keliru?**

- Halaman kejadian VERGO menjadi sumber status terbaru; Instagram mengarahkan pembaca ke sana.
- Terverifikasi berarti bukti ditinjau moderator. Kondisi bersih, kebenaran informasi awal dan progres tugas mempunyai arti berbeda.
- Dukungan/jumlah kiriman tidak mengubah status otomatis; bukti bertentangan ditinjau manusia.
- Selfie/foto wajah pelapor tidak diwajibkan. Foto kondisi, waktu dan konteks lebih relevan untuk pemeriksaan.
- Original foto privat; consent web/Instagram terpisah, tanpa centang otomatis, dan preview publik memakai rendition disetujui.
- Draft otomatis hanya untuk sumber/aset/izin eligible. Admin approve versi final dan menjalankan publish secara eksplisit.
- Gunakan laporan, Komunitas & Hermes, penugasan, notifikasi, kegiatan, Dampak dan Instagram existing; jangan membuat sistem voting kebenaran paralel.
- Klaim dibatasi pada pelaporan/tindak lanjut dan hasil terdokumentasi. Diagnosis dari foto, risiko penyakit otomatis, penurunan penyakit/kematian dan akurasi AI tanpa evaluasi tidak menjadi klaim produk.

## 2. Aturan lomba yang menentukan prioritas

Sumber: GUIDEBOOK.pdf ITASE 7.0 Web Development, 22 halaman, diberikan pemilik proyek; salinannya tidak dimasukkan repository. Nomor halaman di sini mengikuti urutan PDF.

| Penilaian penyisihan, halaman 20 | Bobot | Yang harus ditunjukkan |
| --- | --- | --- |
| Inovasi/kesesuaian SDG | 30% | Masalah kesehatan lingkungan, pembeda, serta alur sampai tindak lanjut. |
| Layout/antarmuka | 30% | Alur mudah ditemukan, responsif, terbaca, loading/empty/error bermakna. |
| Kejelasan tujuan/fitur | 20% | Satu kasus dari laporan sampai pembaruan; peran warga/AI/moderator/pelaksana jelas. |
| Teknis/proposal/video | 20% | Situs hosted, source, metode pengembangan dan demonstrasi interaksi. |

Jadwal guidebook: pengumpulan **17–18 Oktober**, seleksi 20–25 Oktober, pengumuman 26 Oktober, technical meeting 28 Oktober, deck paling lambat **6 November pukul 23.59**, final online **7 November**, awarding 15 November 2026. Jam penutupan pengumpulan 18 Oktober tidak dicantumkan; cocokkan pengumuman terbaru di grup panitia.

- [ ] Pastikan tim 2–3 mahasiswa aktif dari kampus yang sama, administrasi dan ketentuan twibbon/poster terpenuhi.
- [ ] Klarifikasi frasa “belum pernah dipublikasikan” (halaman 11) karena hosting publik juga diwajibkan (13); jelaskan riwayat situs VERGO secara jujur.
- [ ] Jelaskan kontribusi tim, penggunaan model EcoLens, framework/aset/lisensi; jangan mengklaim melatih model atau mempunyai kemitraan yang belum ada.
- [ ] Penuhi orisinalitas/hak cipta dan larangan CMS; framework/library diperbolehkan.

## 3. P0 — Perbaikan inti

Semua checkbox adalah pekerjaan rencana yang belum dinyatakan selesai. Kemampuan existing menjadi fondasi, bukan dihitung ulang sebagai penambahan fitur.

### P0-01 — Pesan manfaat dan jalan masuk

- [ ] Landing menjelaskan hubungan sampah dan kesehatan dalam satu paragraf bersumber, dengan CTA **Laporkan tumpukan sampah**.
- [ ] Scan menjadi bantuan pengenalan material; laporan langsung tetap dapat digunakan saat AI tidak tersedia.
- [ ] Jelaskan warga memberi bukti, moderator memeriksa, penanggung jawab menindaklanjuti.
- [ ] Ilustrasi/contoh/simulasi diberi label; jangan menyajikan angka dampak rekaan sebagai hasil nyata.

Selesai bila pengunjung menemukan cara melapor, arti pemeriksaan dan jalur tindak lanjut dari landing. Modul: `landing-page.tsx`, navigasi/terjemahan, reports existing.

### P0-02 — Pengamatan, dugaan dan bukti laporan

- [ ] Pilihan wajib **Saya melihat langsung / Informasi dari pihak lain**, tanpa default yang mengasumsikan kesaksian langsung.
- [ ] Pisahkan kondisi yang diamati dari dugaan; minta waktu pengamatan, bukan hanya waktu unggah.
- [ ] Tambahkan konteks pilihan yang terlihat, misalnya pembakaran, dekat saluran air, benda tajam. Ini keterangan pelapor untuk ditinjau, bukan diagnosis atau hasil AI.
- [ ] Jelaskan kegunaan foto/lokasi; tidak meminta selfie atau foto bersama tumpukan.
- [ ] Informasi pihak lain mempunyai rujukan/izin; foto internet bukan dokumentasi baru pelapor.
- [ ] Jika foto tidak aman diambil, arahkan ke kanal bantuan yang dikelola atau permintaan informasi privat. Laporan baseline membutuhkan foto; jalur tanpa foto memerlukan keputusan kontrak sebelum implementasi, dan tidak boleh langsung menjadi kejadian terverifikasi.

Selesai bila moderator mengetahui sumber pengamatan, waktu, fakta dan dugaan tanpa menebak. Modul: `report-wizard.tsx`, reports/DTO. Jika field bertambah, sinkronkan schema, fixture, migration dan generated types.

### P0-03 — Arti status dan peta

- [ ] Label **Terverifikasi moderator**, dengan penjelasan “Bukti dan konteks laporan telah diperiksa. Kondisi dapat berubah; lihat waktu pembaruan.”
- [ ] Pertahankan enum laporan; bedakan pemeriksaan, kondisi lapangan dan progres tugas pada tampilan.
- [ ] Peta memperlihatkan periode, kejadian unik, jumlah terbuka, waktu pembaruan dan metode. Jelaskan resolved tetap dapat masuk hitungan historis.
- [ ] Warna peta berarti ringkasan laporan, bukan tingkat penyakit atau kepastian bahaya.
- [ ] Area kosong: **Belum ada laporan terverifikasi pada periode ini. Ini bukan bukti area bersih.**
- [ ] Bukti lama bertanggal jelas; penanda perlu diperbarui mengikuti aturan operasional yang ditetapkan, tanpa otomatis dianggap bersih.

Selesai bila pembaca membedakan tanpa data, kejadian lama, laporan terbuka dan selesai. Modul: public map, incident cards, report-status, areas/public projection; metode tetap [HOTSPOT_RULES.md](HOTSPOT_RULES.md).

### P0-04 — Koreksi dan banding

- [ ] Detail kejadian mempunyai **Perbarui kondisi / Laporkan informasi keliru**, memakai form existing: masih ada, berkurang, terlihat bersih, informasi perlu diperbaiki.
- [ ] Pandu koreksi lokasi/foto/waktu/keterangan; tanyakan waktu melihat kondisi dan beri pilihan bukti tambahan sesuai kebutuhan.
- [ ] Jelaskan kebutuhan login sebelum mengisi, atau simpan draf agar input tidak hilang. Setelah login/verifikasi, kembali ke laporan yang sama tanpa mengirim otomatis.
- [ ] Tanda terima: **Pembaruan terkirim, menunggu pemeriksaan**. Pengirim dapat mengikuti keputusan/permintaan bukti melalui tautan/notifikasi berizin.
- [ ] Pelapor dapat meminta peninjauan keputusan dengan alasan/bukti tambahan, terikat laporan dan keputusan sebelumnya. Sepakati jalur backend sebelum menambah tombol banding.
- [ ] Moderator membedakan fakta keliru, duplikat, bukti kurang dan kondisi berubah; penolakan atau kondisi sekarang bersih tidak otomatis diberi label hoaks.
- [ ] Keputusan menampilkan catatan publik aman, tanggal dan riwayat koreksi; alasan internal tetap privat.
- [ ] Bila ada bukti kredibel yang membantah laporan atau membahayakan privasi, moderator dapat menahan distribusi/publikasi sesuai scope selama pemeriksaan. Jumlah komplain saja tidak otomatis menyembunyikan laporan.

Selesai bila koreksi dapat dilacak sampai keputusan tanpa vote langsung mengubah status atau pending bocor. Modul: `community/condition-form.tsx`, `admin-community-review.tsx`, community/review/evidence dan notifications.

### P0-05 — Keselamatan dan privasi foto

- [ ] Panduan sebelum kamera/unggah: foto dari jarak aman dan jangan menyentuh sampah berbahaya. Kanal darurat setempat hanya dicantumkan setelah diverifikasi.
- [ ] Original berlabel **Untuk pemeriksaan**; izin penggunaan web dan Instagram terpisah.
- [ ] Reviewer memeriksa wajah/anak/plat/alamat; gunakan crop/redaksi/rendition atau tahan foto dari publikasi.
- [ ] Preview sesuai hasil publikasi; jangan menjanjikan blur otomatis sebelum fiturnya tersedia dan diperiksa.
- [ ] Pencabutan izin menahan publikasi berikutnya dan memulai penarikan terkait; penarikan akses VERGO berbeda dari konfirmasi hapus Instagram.
- [ ] Jelaskan pembaca bukti asli dan retensinya; operator menetapkan masa simpan sebelum menjadi janji publik.

Selesai bila pengguna tahu foto mana yang privat/publik tanpa diwajibkan menunjukkan wajah atau mendekati bahaya. Modul: report/update forms, evidence/consents/renditions dan publikasi.

### P0-06 — Penanganan sampai bukti hasil

- [ ] Pakai Penugasan & SLA untuk PIC, penerimaan tugas, tenggat dan progres; berikan perkembangan aman kepada pelapor/follower.
- [ ] Tugas done memicu pemeriksaan hasil, bukan otomatis mengubah laporan menjadi resolved.
- [ ] Pakai kegiatan dan bukti sebelum/sesudah existing; lokasi/waktu dapat dibandingkan, partial tetap partial, claim resolusi divalidasi moderator.
- [ ] Jika belum ada pelaksana, tampilkan **Belum ada penanggung jawab**, tanpa janji penanganan.
- [ ] Tentukan operator, pengganti, ritme triase dan eskalasi yang sanggup dijalankan. Koneksi pemerintah/mitra hanya disebut jika benar-benar ada.

Selesai bila satu kasus dapat ditelusuri sampai penyelesaian berbukti atau penjelasan hambatannya. Modul: operations/assignments, activities, evidence, moderation dan notifications.

## 4. P1 — Penguatan sebelum final

### P1-01 — Instagram dan status yang selalu dapat diperbarui

- [ ] Poster/caption memuat tanggal pengamatan, area publik, label laporan warga yang ditinjau moderator dan URL kejadian kanonik.
- [ ] URL dapat disalin/QR dipindai serta dibaca tanpa login. Penempatan link mengikuti kemampuan akun saat integrasi; jangan menjanjikan caption Feed selalu dapat diklik.
- [ ] Tampilkan alasan draft belum eligible bila foto/izin/sumber belum memenuhi syarat; verified tidak otomatis publish.
- [ ] Perubahan/koreksi sumber membuat pemberitahuan untuk admin dan daftar unggahan terdampak.
- [ ] Koreksi tampil jelas di halaman VERGO; admin menindaklanjuti unggahan lama melalui kemampuan provider yang tersedia: koreksi/komentar jika didukung, unggahan lanjutan atau penarikan bila perlu.
- [ ] Timeout/failed/needs_action mempunyai pemilik tindak lanjut; sukses hanya setelah konfirmasi.

Selesai bila pembaca unggahan awal dapat menemukan kondisi/koreksi terbaru, dan admin tidak menganggap perubahan VERGO otomatis memperbarui semua Instagram.

### P1-02 — UI dan bantuan

- [ ] Tinjau ponsel, keyboard/fokus, keterbacaan, target sentuh, reduced motion, izin kamera/GPS ditolak, pin manual, input/konflik dan peta/koneksi gagal.
- [ ] Bahasa Indonesia mudah ditemukan dan preferensi tersimpan dihormati; jika default diubah untuk pilot, sinkronkan SSR/cookie/metadata.
- [ ] Bantuan/VERA menjelaskan status, tanpa data, privasi dan koreksi dengan sumber/tanggal review.
- [ ] Jawaban tidak diketahui atau provider mati mempunyai pesan dan jalur Bantuan; AI tidak memastikan kebersihan atau kesehatan wilayah.

### P1-03 — Bukti manfaat, pembeda dan operasi

- [ ] Pilot satu komunitas/area dengan PIC yang benar-benar bersedia.
- [ ] Amati 3–5 pengguna memahami status, melapor dan mengirim koreksi; ini target riset awal, belum hasil.
- [ ] Dokumentasikan minimal satu kasus nyata berizin sampai tindak lanjut; bila belum tersedia, demo berlabel simulasi.
- [ ] Catat keberhasilan mengisi laporan, waktu pemeriksaan/respons, penyelesaian dengan bukti, pembaruan diterima dan kejadian berulang; cantumkan periode/definisi/denominator.
- [ ] Berat berasal pengukuran sah. Aktivitas platform dibedakan dari hasil lapangan dan penurunan penyakit yang memerlukan studi.
- [ ] Catat beban moderator, biaya aktual host/storage/peta/AI/publikasi, kapasitas dan pihak pemelihara setelah lomba.
- [ ] Bandingkan 2–3 solusi relevan dengan sumber resmi. Tunjukkan pembeda alur/bukti/pilot; hindari klaim pertama/satu-satunya tanpa riset.

P2 setelah alur inti terbukti: perluasan cakupan, kemitraan dan evaluasi model mengikuti hasil pilot. Marketplace, diagnosis/prediksi penyakit, selfie wajib, migrasi namespace teknis dan verifikasi/publish otomatis tidak diprioritaskan untuk lomba.

## 5. Workflow demonstrasi

**Warga:** temukan kondisi → laporan langsung/scan → sumber pengamatan → foto aman/lokasi/waktu/konteks → preview/izin → kirim privat → keputusan/permintaan bukti → pantau tindak lanjut → pembaruan atau koreksi.

**Admin/pelaksana:** baca bukti/saran Hermes atau review manual → minta bukti/verify/reject/duplicate → ringkasan aman → penugasan/penerimaan → progres → periksa hasil → resolve atau tetap terbuka → kronologi/notifikasi/publikasi diperbarui.

**Pembaca Instagram:** unggahan bertanggal → URL VERGO → status/waktu terbaru → pembaruan/koreksi → login bila perlu dan kembali → kirim bukti → tanda terima → moderator memutuskan → halaman dan tindak lanjut publikasi diperbarui.

| Kasus | Hasil yang diharapkan |
| --- | --- |
| Sampah benar ada lalu dibersihkan | Simpan kejadian historis sah dan bukti penanganan. |
| Foto lama diklaim kondisi sekarang | Periksa tanggal/sumber; koreksi konteks atau tarik klaim tak didukung. |
| Salah lokasi/foto | Koreksi dengan riwayat; batalkan approval konten tidak cocok dan tindak lanjuti unggahan. |
| Banyak dukungan tanpa bukti | Tidak menambah kepastian atau otomatis mengubah status. |
| Pembaruan bertentangan | Tinjau bukti/waktu, minta tambahan, jangan memutuskan lewat jumlah suara. |
| Bukti sensitif/izin dicabut | Tahan/putus akses publik terkait, lacak penarikan provider terpisah. |
| Tugas selesai tanpa bukti | Moderator tetap memeriksa resolusi; status tugas dan laporan dibedakan. |

## 6. Pelaksanaan dan kepemilikan

| Tahap | Keluaran/prioritas |
| --- | --- |
| A — Pengumpulan 17–18 Oktober menurut guidebook | Kelayakan/jam deadline, pesan SDG/status/no-data, alur siap demo, proposal/video dengan status fitur jujur; jangan memaksakan perubahan besar yang belum siap. |
| B — Setelah pengumpulan | P0 formulir, koreksi/banding, keselamatan/consent dan tindak lanjut sampai bukti hasil; catat acceptance. |
| C — Sebelum final bila lolos | Tautan/koreksi Instagram, UI, pilot/metrik, biaya/operasi dan deck. |
| D — Final | Presentasi 10 menit, tanya jawab 10 menit: satu kasus lengkap, bukti manfaat dan batas produk. |

Frontend/UI dan backend/data/integrasi mengikuti pembagian tim existing. Tim mengisi PIC moderator, pelaksana pilot dan penyusun berkas sebelum menjanjikan layanan. Status diperbarui pada backlog ini dengan tanggal, commit, lingkungan dan bukti; jangan membuat rangkaian rencana/hasil yang menduplikasi.

## 7. Paket pengumpulan

- [ ] Proposal Indonesia: A4, Times New Roman 12 pt, spasi 1,5; margin kiri 4 cm, kanan/atas/bawah 3 cm; maksimal 30 halaman di luar lampiran.
- [ ] Cover (karya/logo/tim/anggota/instansi), daftar isi, Bab 1 latar belakang/tujuan/manfaat, Bab 2 metode pengembangan, Bab 3 solusi/fitur/alur/wireframe atau screenshot, Bab 4 kesimpulan/saran, daftar pustaka APA, lampiran.
- [ ] Mockup/screenshot dan video menunjukkan minimal 50% pengembangan sesuai guidebook; bedakan fitur berjalan, simulasi dan rencana.
- [ ] Lampiran URL website hosted publik, repository GitHub/GitLab dan YouTube dapat dibuka juri; akses demo peran tidak membuka data pengguna asli.
- [ ] Nama file `Proposal_VERGO_NamaTim_ITASE2026.pdf`, memakai nama tim sebenarnya.
- [ ] Video MP4 maksimal 3 menit di YouTube, judul `ITASE 7.0 2026 - (Nama Tim) - VERGO`; tautan pada proposal/form.
- [ ] Video memperlihatkan proses perancangan dan interaksi pengguna. Contoh 20 detik masalah/SDG + 20 detik rancangan + 110 detik alur + 30 detik manfaat/batas = 180 detik.
- [ ] Periksa administrasi, surat orisinalitas dan form menurut panitia terbaru; tautan draft bukan pengumpulan final.
- [ ] Bila lolos: technical meeting, deck PPT/PDF paling lambat 6 November 2026 pukul 23.59 menurut guidebook.

<a id="gerbang-rilis"></a>

## 8. Gerbang rilis dan bukti

Ini mewarisi pekerjaan terbuka lama tanpa menganggapnya masih gagal ataupun sudah lulus. Tidak ada persen kesiapan baru sebelum bukti direkonsiliasi. Pengujian aplikasi dilakukan pada pekerjaan implementasi relevan; perapian dokumentasi ini hanya memeriksa dokumen.

| ID | Bukti sebelum fitur terkait diklaim siap |
| --- | --- |
| A-01 | Guest → login/verifikasi → tujuan kembali; role/owner/coordinator, cookie/CSRF benar. |
| A-02 | Laporan tanpa scan, sumber/waktu, private pending, semua keputusan/revisi/replay dan award/reversal tidak ganda. |
| A-03 | Scan sampai ledger; identitas model, taxonomy/unknown/no-waste/invalid, crash/retry/outbox/lease, latensi/biaya. |
| A-04 | Peta/list/detail konsisten per periode/canonical; no-data/stale/error jujur; GPS/original/pending tidak bocor; cache mengikuti koreksi/withdrawal. |
| A-05 | Koreksi/banding/revisi/request-evidence/reject/approve terlacak, AI mati dapat ditangani manusia, vote tidak mengubah status. |
| A-06 | Consent/approval per kanal/revisi, rendition/preview nyata, expiry/revoke dan media lintas owner aman. |
| A-07 | Penugasan/progres, kapasitas/jadwal/kehadiran, partial/complete, resolusi claim sah dan revoke ketika sumber berubah. |
| A-08 | Dampak eligible, null/nol, koreksi/canonical/withdrawal dan anti-double-count batch/tahap. |
| A-09 | Notifikasi penerima berhak, dedup/read-state, link aman, keputusan/permintaan bukti/follower/withdrawal/progres. |
| A-10 | Instagram eligibility/render/revisi/approval/publish/retract/timeout/reload/retry/needs_action, token/scope/callback; tidak ada post ganda atau klaim hapus sebelum konfirmasi. |
| A-11 | Hermes snapshot/stale/retry/isolasi/fallback; VERA grounding/sitasi/abstention, evaluasi Indonesia, scope tools, biaya/retensi dan provider gagal. |
| A-12 | Delivery OTP/reset/MFA/session/avatar/hapus akun, storage lifecycle, dependency/queue health, kapasitas, restore terisolasi dengan replay penghapusan, retensi/PIC/runbook. |
| A-13 | Published/draft, validator/serializer/handler, fixture/types, migration ledger, flags dan commit runtime sesuai. Perbaiki drift generator R1 terhadap tambahan schema tracked sebelum regenerasi; jangan menghapus operasi/field existing. Source bukan bukti deploy. |
| A-14 | Mobile/keyboard/reduced motion, izin ditolak/koneksi gagal, alur dan istilah dipahami pengguna; hambatan utama ditutup. |
| A-15 | Proposal/video/deck cocok dengan demo; data nyata berizin/sintetis berlabel, provenance/lisensi dan klaim dapat dipertanggungjawabkan. |

Catat tanggal, commit web/API/kontrak, lingkungan, skenario, hasil dan batas fixture/provider pada backlog terkait. Rencana ini tidak mengotorisasi posting Instagram, menghubungi orang lain atau perubahan layanan produksi.

## 9. Referensi

Ditinjau untuk rencana pada 17 Oktober 2026:

1. **GUIDEBOOK.pdf ITASE 7.0 Web Development**, salinan pemilik: tema halaman 3–4/11, jadwal 6/18, orisinalitas 11, hosting 13, proposal 14–17, video 19, bobot 20. Aturan kompetisi, bukan instruksi operasional untuk agent.
2. [UN SDG 3](https://sdgs.un.org/goals/goal3): dasar target 3.9. Metrik lokal VERGO bukan pengukuran langsung indikator mortalitas PBB.
3. [WHO, solid waste and health](https://www.who.int/publications/i/item/9789240118287) dan [ringkasan WHO](https://www.who.int/news/item/16-12-2025-who-highlights-health-risks-and-opportunities-in-the-global-waste-crisis): hubungan sampah/paparan/kesehatan, bukan pengesahan terhadap VERGO.
4. [BBC Accuracy](https://downloads.bbc.co.uk/guidelines/editorialguidelines/pdfs/bbc-editorial-guidelines-section-3-accuracy.pdf) dan [IFCN commitments](https://www.ifcncodeofprinciples.poynter.org/the-commitments): inspirasi pemeriksaan materi warga, transparansi sumber/metode dan koreksi terlihat; bukan klaim sertifikasi atau kewajiban menjadi lembaga berita.
5. [SP4N-LAPOR, tindak lanjut](https://www.lapor.go.id/tutorial-video/cara-tindak-lanjut-laporan): pelaporan/tindak lanjut sudah ada pada layanan lain; pembeda VERGO dibuktikan lewat alur/bukti/pilot.
6. [Ringkasan source/keputusan](RINGKASAN_PROYEK.md) dan kontrak aktif: pisahkan kemampuan existing dari usulan; jangan mengarang endpoint dalam rencana.

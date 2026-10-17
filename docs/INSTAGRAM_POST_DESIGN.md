# Acuan poster Instagram VERGO

Instruksi Zamani, 3 Oktober 2026. [Referensi visual](research/assets/sap-instagram-post-reference.png). Melengkapi [kontrak](CONTRACT_ZAKA_ZAMANI.md) dan [rencana aktif](RENCANA_ITASE_2026.md). Ketentuan ini mengatur poster, bukan layout dashboard Zaka.

**Batas bukti:** QA poster lokal 5 Oktober 2026 bersifat historis dan dirangkum di [ringkasan proyek](RINGKASAN_PROYEK.md). Foto berizin dari laporan aktual, sumber lokasi, preview Meta dan publish/retract memerlukan acceptance sesuai [rencana aktif](RENCANA_ITASE_2026.md#gerbang-rilis). Nama template/aset teknis lama tidak diubah hanya untuk mengganti merek.

## Tampilan

Buat semirip mungkin dengan referensi: potret 4:5, latar krem bertekstur, hijau tua dan kuning; logo VERGO kiri atas; judul besar/tebal dengan nama kawasan berwarna hijau; baris lokasi dengan ikon; foto lebar dengan potongan diagonal; panel hijau untuk waktu WIB, kategori, dan kode laporan; inset peta kanan bawah dengan bingkai krem; stempel status; CTA kuning “Pantau perkembangan di VERGO”, panah, dan ornamen daun/geometris.

Pemenggalan judul mengikuti panjang data nyata tanpa menghilangkan nama lokasi atau menimpa foto. Logo/font/aset template dibundel dan diberi versi. Label simulasi, foto ilustrasi, peta ilustratif, nomor 03, dan SAP-024 tidak disalin ke poster produksi. Poster demo tetap harus ditandai sebagai demo.

## Foto nyata

Gunakan foto bukti yang benar-benar terkait laporan/update/hasil kegiatan dan telah memiliki consent Instagram pemilik, approval moderator, serta rendition siap. Jangan menggantinya dengan foto stok, gambar contoh, foto generatif, atau kejadian lain. Cropping harus tetap menunjukkan bukti utama; redaksi privasi yang disetujui tetap diterapkan. Jika foto/izin belum tersedia atau dicabut, draf tidak siap dan publish ditahan.

## Peta nyata

Jalan, batas wilayah, dan geometri kawasan memakai data geografis nyata untuk lokasi laporan. Warna hijau/kuning mengikuti referensi, tetapi bentuk geografis tidak dikarang. Atribusi sumber/lisensi harus tetap terbaca sesuai kewajiban penyedia.

Peta tetap mengikuti batas lokasi publik dalam kontrak: exact GPS privat tidak dibuka. Pin pada posisi representatif diberi keterangan “Area laporan”, bukan diklaim titik sampah tepat. Nama kawasan/kecamatan/kota harus berasal dari data lokasi yang benar dan disetujui; jangan menyalin Muharto ke laporan lain atau menggunakan H3 ID sebagai nama kawasan.

Simpan snapshot peta dan metadata sumber bersama revisi poster agar preview sama dengan hasil publish. Kegagalan mendapatkan peta nyata harus ditampilkan sebagai kegagalan render, tanpa fallback diam-diam ke peta ilustrasi.

## Data dan approval

Judul, lokasi, waktu, kategori, kode laporan, status, dan caption memakai sumber approved yang sama. Waktu adalah waktu kejadian/observasi, ditampilkan WIB, bukan waktu render. Stempel terverifikasi mengikuti keputusan manusia; hasil sebagian berlabel sebagian dan tidak mengaku kejadian selesai.

Perubahan foto, peta/lokasi, template, atau data relevan mengubah revisi dan membatalkan approval lama sesuai kontrak. Admin melihat poster lengkap dengan foto dan peta nyata sebelum publish. Kemiripan visual dan integrasi belum diperiksa.

## Implementasi peta dan aset

Template poster VERGO v6 menghasilkan JPEG sRGB 1080 × 1350, maksimum internal 7 MiB. Font Roboto Black dan Roboto Condensed Bold dibundel bersama lisensi Apache 2.0; deploy worker harus menyertakan folder `apps/worker/assets` di samping `dist`.

Inset peta dibuat dengan Mapbox Static Images API dan style yang kompatibel seperti `mapbox/streets-v12` (Static Images API belum mendukung Mapbox Standard). Area kuning berasal dari poligon H3 publik resolution9; API hanya menerima centroid dan poligon sel tersebut, bukan exact GPS privat. Nama kelurahan/kecamatan/kota berasal dari tabel `area_localities`. Atribusi Mapbox dan OpenStreetMap tetap ditampilkan oleh peta.

Gambar disimpan dalam cache berdasarkan sel H3 dan versi style selama 168 jam. Provider dicoba ulang sampai tiga kali untuk gangguan jaringan/rate limit/server. Jika gagal, cache lama dapat digunakan sampai 30 hari dan diberi label tanggal peta dasar; tanpa cache yang valid, render tetap ditahan. Metadata hash, style, lokasi publik, dan tanggal sumber ikut disimpan bersama rendition poster.

Konfigurasi: `SAP_INSTAGRAM_RENDER_ENABLED`, `POSTER_MAPBOX_TOKEN`, `POSTER_MAPBOX_STYLE`, `POSTER_MAP_CACHE_HOURS`, dan `POSTER_MAP_DAILY_LIMIT`. Token dengan scope `styles:tiles` diperlukan; token khusus worker lebih baik. Jika memakai token publik peta web, pastikan akses Static Images cocok dengan pembatasan token. Simpan konfigurasi pada environment server dan jangan log URL request yang memuat token. Batas harian berlaku pada setiap permintaan provider termasuk retry. Flag render default false. Menyalakan render tidak menyalakan publish; approval admin tetap diperlukan. API Static Images, overlay GeoJSON, dan harga: [dokumentasi](https://docs.mapbox.com/api/maps/static-images/) dan [pricing](https://www.mapbox.com/pricing).

# Deployment VERGO di Vercel

Dokumen ini menyiapkan deployment dari branch `codex/vercel-deploy`. Branch `main` tetap untuk deployment VPS. Layout yang disiapkan adalah dua proyek Vercel dari satu repo: Next.js di `apps/web` dan API NestJS di `apps/api`. Worker antrean tetap berjalan sebagai proses persisten di Armbian.

## Bentuk deployment

```text
Browser
  └─ https://vergo.venlab.tech (Next.js / apps/web)
       ├─ /api/v1/* → proxy server-side → https://api.vergo.venlab.tech (NestJS / apps/api)
       └─ unggah foto → URL PUT berumur pendek → Cloudflare R2

Armbian worker ── Redis / Neon / R2 / layanan ML
Vercel API ────── Redis / Neon / R2
```

`vergo.venlab.tech` tetap menjadi domain web. API memakai hostname terpisah, misalnya `api.vergo.venlab.tech`. Browser tetap memanggil URL same-origin `/api/v1`; cookie dan CSRF diteruskan oleh Next.js ke API. Daftarkan hostname API di proyek Vercel API dan DNS ketika siap. Jangan arahkan domain web ke proyek API.

Vercel menjalankan NestJS sebagai satu Node Function dari `apps/api/src/main.ts`. Worker tidak cocok dijalankan sebagai function karena worker memakai proses antrean dan scheduler yang terus hidup.

## Proyek Vercel

Buat dua proyek dari repo yang sama dan pilih branch `codex/vercel-deploy`. Di **Settings → Git**, set **Production Branch** ke `codex/vercel-deploy` pada kedua proyek supaya push branch itu membangun deployment Vercel. Jangan merge branch ini ke `main`; `main` tetap untuk VPS.

| Pengaturan | Proyek web | Proyek API |
|---|---|---|
| Root Directory | `apps/web` | `apps/api` |
| Framework | Next.js (auto-detect) | NestJS (auto-detect) |
| Build Command | default Next.js | `npm run build:vercel` dari `apps/api/vercel.json` |
| Output Directory | default Next.js | kosong/default |
| Node.js Version | 22.x | 22.x |

Pada kedua proyek, aktifkan **Include source files outside of the Root Directory** supaya npm workspace di root dan `packages/config` tersedia. Gunakan package manager npm dari `package-lock.json` di root. Jangan membuat root project tambahan untuk seluruh monorepo.

Proyek API harus menggunakan `apps/api/vercel.json`. Script `build:vercel` membangun `@sap/config` sebelum API agar import workspace `@sap/config` tersedia saat function dibundel. Entry point Nest `src/main.ts` dipertahankan.

## Environment variables

Isi environment **Production** dan **Preview** secara sengaja; jangan commit nilai secret atau file `.env`. Nilai runtime di bawah berasal dari schema [packages/config/src/index.ts](../packages/config/src/index.ts). Gunakan nilai dari backup VPS atau provider yang benar, bukan contoh palsu.

### Proyek web (`apps/web`)

| Variable | Nilai |
|---|---|
| `APP_ORIGIN` | `https://vergo.venlab.tech` |
| `API_INTERNAL_URL` | `https://api.vergo.venlab.tech` |
| `MAPBOX_PUBLIC_TOKEN` | Token Mapbox publik berawalan `pk.`; batasi allowed URL ke domain web dan domain preview yang memang dipakai. |

`MAPBOX_PUBLIC_TOKEN` dibaca dari route runtime `/api/map-config`. Tanpanya, peta dasar masih dapat tampil, tetapi peta Mapbox/3D tidak tersedia. Berkas statis yang tersimpan di `apps/web/public` akan disertakan oleh build Next.js.

### Proyek API (`apps/api`)

| Variable | Kegunaan / nilai |
|---|---|
| `NODE_ENV` | `production` (biasanya sudah disediakan Vercel). |
| `APP_ORIGIN` | `https://vergo.venlab.tech`; harus sama persis dengan origin browser. |
| `APP_ORIGIN_ALIASES` | Kosong jika tidak ada origin web tambahan. Jika ada, isi origin lengkap dipisahkan koma, mis. `https://www.vergo.venlab.tech`. Jangan masukkan path. |
| `API_INTERNAL_URL` | URL publik API, mis. `https://api.vergo.venlab.tech`; juga diisi di proyek web agar proxy tahu tujuan API. |
| `CONTRACT_VERSION` | `1.1.0` |
| `DATABASE_URL` | Connection string Neon **pooled** untuk runtime (host Neon dengan `-pooler`). |
| `DATABASE_DIRECT_URL` | Connection string Neon direct; digunakan hanya untuk migrasi/CLI, bukan koneksi runtime. |
| `REDIS_URL` | URL TCP/TLS Upstash dengan protokol `rediss://` untuk ioredis dan BullMQ; bukan URL REST Upstash. API dan worker harus memakai instance Redis yang sama. |
| `SESSION_SECRET` | Secret acak minimal 32 karakter. |
| `CSRF_SECRET` | Secret acak berbeda dari `SESSION_SECRET`, minimal 32 karakter. |
| `MAIL_TRANSPORT` | `resend` |
| `RESEND_API_KEY` | API key Resend aktif. |
| `MAIL_FROM` | Alamat/nama pengirim yang domainnya sudah diverifikasi di Resend. |
| `S3_ENDPOINT` | Endpoint S3 Cloudflare R2 berbentuk `https://<account-id>.r2.cloudflarestorage.com`. |
| `S3_REGION` | `auto` |
| `S3_BUCKET` | Nama bucket R2 yang dipakai VERGO. |
| `S3_ACCESS_KEY_ID` | R2 access key dengan izin yang diperlukan pada bucket tersebut. |
| `S3_SECRET_ACCESS_KEY` | Secret key pasangannya. |
| `ML_INFERENCE_URL` | Endpoint layanan ML yang dapat dijangkau worker. API tidak menjalankan inferensi, tetapi schema saat ini tetap mewajibkan nilai ini saat startup. |
| `ML_USERNAME` | Kredensial endpoint ML. |
| `ML_PASSWORD` | Kredensial endpoint ML. |

`DATABASE_DIRECT_URL` bersifat opsional untuk runtime dan sangat dianjurkan untuk migrasi. CLI akan memakai `DATABASE_URL` sebagai fallback, tetapi endpoint pooled Neon dapat menolak DDL atau pola advisory lock yang dipakai migrasi. `S3_REGION` memiliki default `auto`; variabel lain di tabel API adalah wajib menurut schema saat ini. Jika konfigurasi ML belum tersedia, jangan isi URL asal: API saat ini tetap meminta ketiga field ML itu saat validasi env, dan worker tidak dapat memproses scan tanpa layanan ML yang aktif.

Fitur tambahan seperti SAPA, komunitas, aktivitas, Instagram, MFA, dan Hermes memiliki flag serta secret opsional tersendiri di schema config. Biarkan flag tetap `false` untuk deployment awal kecuali dependensi, migration, dan kredensial fitur tersebut sudah disiapkan. Jika diaktifkan, lengkapi seluruh variable kondisional yang disebut schema.

Buat dua secret berbeda secara lokal bila belum ada, lalu masukkan langsung ke pengelola env Vercel:

```sh
openssl rand -hex 32
openssl rand -hex 32
```

Jangan salin hasilnya ke repo, dokumentasi, atau chat.

## Neon, worker, dan migrasi

1. Pulihkan/siapkan database VERGO di proyek Neon yang benar. Pastikan bukan proyek VenFinance.
2. Pasang `DATABASE_URL` pooled pada API dan worker; simpan `DATABASE_DIRECT_URL` untuk proses migrasi.
3. Jalankan migrasi dari checkout branch ini dengan production env yang didapat melalui kanal secret yang aman:

   ```sh
   npm run build -w @sap/config
   npm run migrate -w @sap/api
   ```

   CLI migrasi memilih `DATABASE_DIRECT_URL` jika tersedia. Pastikan semua migrasi selesai sebelum mengalihkan trafik.
4. Jalankan worker sebagai service persisten di Armbian. Berikan worker Redis TLS yang sama, database, R2, dan konfigurasi ML yang aktif. Worker memproses scan, BullMQ, outbox, dan pekerjaan terjadwal; deployment API di Vercel tidak menggantikannya.
5. Pertahankan backup database sebelum migrasi produksi dan pastikan worker memakai schema yang kompatibel.

## CORS Cloudflare R2 untuk unggah langsung

Foto diunggah browser langsung ke R2 supaya request 10 MiB tidak melewati batas body Vercel Functions sebesar 4,5 MB. API membuat URL PUT yang berlaku lima menit; API kemudian membaca ulang object, memeriksa tipe/ukuran/dimensi, menghapus metadata gambar, dan menyimpan hasil normalisasi dengan key private.

Tambahkan aturan CORS bucket R2 dengan origin produksi yang tepat. Gabungkan aturan ini dengan CORS yang sudah ada jika bucket dipakai layanan lain. Contoh untuk produksi:

```json
[
  {
    "AllowedOrigins": ["https://vergo.venlab.tech"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Jika menguji preview, tambahkan origin preview yang dipakai secara eksplisit ke CORS R2 dan `APP_ORIGIN_ALIASES` API. Jangan memakai wildcard origin untuk bucket privat. URL R2 tetap bertanda tangan; jangan membuat bucket publik hanya agar gambar tampil. Tambahkan aturan lifecycle R2 untuk menghapus prefix `upload-pending/` setelah satu hari. URL PUT dapat dipakai ulang hingga kedaluwarsa, sehingga lifecycle juga membersihkan object sementara yang mungkin dibuat ulang setelah API menghapusnya.

## Urutan aktivasi

1. Siapkan env Vercel untuk API dan web, Neon, Upstash TCP/TLS, Resend, endpoint ML, serta R2.
2. Jalankan migrasi menggunakan Neon direct connection.
3. Terapkan CORS bucket R2 untuk domain web.
4. Deploy API branch ini terlebih dahulu dan pasang hostname API.
5. Deploy web branch ini, arahkan `API_INTERNAL_URL` ke hostname API, lalu pasang `vergo.venlab.tech` pada proyek web.
6. Pastikan worker Armbian aktif dan terhubung ke provider yang sama.
7. Periksa `https://api.vergo.venlab.tech/api/v1/health/live` dan `/api/v1/health/ready`. Readiness harus menunjukkan database tersedia; Redis/R2 harus tersedia untuk fitur antrean dan media.
8. Verifikasi login, verifikasi email Resend, upload foto di bawah dan di atas 4,5 MiB, URL avatar bertanda tangan, peta 2D/3D, dan satu scan sampai worker memprosesnya.

Perubahan source code pada branch ini belum mengubah DNS, environment provider, database, ataupun deployment yang sedang aktif. Deploy baru dilakukan setelah konfigurasi provider dan migrasi siap.

## Batas platform yang perlu diperhatikan

- Vercel mengemas NestJS sebagai satu Node Function; seluruh batas ukuran paket, memori, waktu eksekusi, dan skala fungsi berlaku pada API.
- Endpoint unggah browser sudah memakai direct-to-R2. Endpoint multipart lama dipertahankan untuk kompatibilitas lokal, tetapi request lebih dari 4,5 MB tidak boleh melewati Function Vercel.
- API, worker, dan web harus berbagi konfigurasi origin yang konsisten. Cookie diterbitkan API lalu diteruskan same-origin melalui Next proxy; pengujian preview memerlukan origin yang diizinkan secara eksplisit.
- R2 GET tetap private dan memakai signed URL singkat. Token Mapbox bersifat publik; semua key Resend, R2, Neon, Redis, ML, session, dan CSRF harus disimpan sebagai secret.

## Rujukan resmi

- [NestJS di Vercel](https://vercel.com/docs/frameworks/backend/nestjs)
- [Monorepo Vercel](https://vercel.com/docs/monorepos)
- [Batas body Vercel Functions dan unggah langsung](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)
- [URL bertanda tangan Cloudflare R2](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [CORS Cloudflare R2](https://developers.cloudflare.com/r2/buckets/cors/)
- [Object lifecycle Cloudflare R2](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)

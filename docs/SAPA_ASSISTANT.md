# VERA — panduan asisten dan operasi

Diperbarui 17 Oktober 2026. Nama tampilan **VERA**; nama teknis SAPA dan berkas ini dipertahankan untuk kompatibilitas. Ini panduan source, bukan klaim kualitas jawaban atau kesiapan provider live. Brief, prompt contoh dan FAQ rancangan lama telah dirangkum di [ringkasan proyek](RINGKASAN_PROYEK.md).

## 1. Perilaku dan batas

VERA adalah bantuan opsional untuk navigasi, penjelasan fitur dan informasi lingkungan. Preferensi akun tetap `sapaEnabled`; menutup panel berbeda dari menonaktifkan fitur. Pet/chat mengikuti layar dan reduced motion serta tidak boleh menutupi alur laporan.

- Source menyediakan FAQ, retrieval hybrid opsional dan query tools terbatas dengan scope sesi server.
- Tidak ada write tools untuk mengirim laporan, mengubah akun/status, memoderasi, memublikasikan atau menghapus konten.
- Data caller dibatasi oleh layanan backend; pertanyaan/prompts tidak mengizinkan akses akun lain atau resource admin.
- Jawaban dan suggested actions disanitasi; tujuan navigasi memakai allowlist, bukan URL bebas dari model.
- Klasifikasi sampah, kebenaran laporan dan kebersihan lokasi tetap hal berbeda. VERA tidak mendiagnosis atau menjamin kesehatan area.
- Penjelasan poin, badge, status dan metode peta harus mengikuti aturan yang direview, bukan contoh FAQ lama yang bertanda TODO.

## 2. API dan source acuan

Semua route relatif terhadap `/api/v1`. Bentuk final mengikuti [published OpenAPI](../contracts/openapi.json) serta validator/serializer source, bukan DTO brief lama.

| Route | Tujuan |
| --- | --- |
| `GET /auth/me` | Preferensi `sapaEnabled` pada User. |
| `PATCH /users/me/preferences` | Mengubah preferensi, dengan sesi/CSRF. |
| `POST /assistant/chat` | Pesan, page context dan konteks percakapan yang diizinkan. |
| `DELETE /assistant/conversations/{conversationId}` | Menghapus konteks percakapan caller. |

Source: `apps/api/src/assistant/`, `apps/web/components/sapa-client.ts`, komponen pet/chat, dan katalog bantuan. Token/secret tidak disimpan dalam draf frontend atau dibocorkan pada log.

## 3. Provider dan retrieval

| Konfigurasi | Fungsi |
| --- | --- |
| `SAPA_FEATURE_ENABLED` | Ketersediaan layanan server. |
| `SAPA_LLM_BASE_URL`, `SAPA_LLM_API_KEY`, `SAPA_LLM_MODEL` | Provider OpenAI-compatible server-only. |
| `SAPA_LLM_TIMEOUT_MS`, `SAPA_LLM_MAX_OUTPUT_TOKENS`, `SAPA_LLM_TEMPERATURE` | Batas panggilan/jawaban. |

Seluruh nilai, validasi dan flag retrieval/tool tambahan mengikuti `packages/config/src/index.ts` serta `.env.example`. Variabel gateway SAPA juga digunakan vision scan/embedding; perubahan provider tidak boleh diasumsikan hanya berdampak pada chat.

Retrieval memakai FAQ terkurasi dan dukungan PostgreSQL vector/full-text di source. Keberadaan embedding/retrieval bukan bukti relevansi atau grounding. Sumber bantuan harus mempunyai provenance, tanggal review dan aturan aktif; perubahan kebijakan harus diikuti materi bantuan.

## 4. Kegagalan dan privasi

Feature mati/provider gagal dapat menghasilkan `503 ASSISTANT_UNAVAILABLE`; preferensi caller mati memakai `ASSISTANT_DISABLED` sesuai kontrak. Agent yang gagal pada jalur recoverable dapat mencoba jalur provider FAQ; bila provider final gagal, tidak ada jaminan jawaban statis otomatis. UI mempertahankan input dan memberi jalur Bantuan/retry yang jelas.

Penyimpanan/rate limiter menggunakan Redis dan scope caller. Lease/operasi atomik melindungi turn; kegagalan store tidak melewati limiter. Catatan kuota Redis habis pada 4 Oktober adalah kejadian historis, bukan diagnosis layanan saat ini. Diagnosis memakai log aman, konfigurasi dan metrik lingkungan tanpa mencetak credential atau isi chat.

Retensi percakapan, biaya/kuota, timeout, concurrency dan pemulihan diperiksa menurut konfigurasi aktual. Jangan menjanjikan riwayat permanen atau fallback manusia otomatis sebelum alurnya tersedia.

## 5. Penerimaan yang masih perlu bukti

- Alur UI/API/provider dengan sesi nyata, timeout/store/provider mati dan recovery tanpa replay ganda.
- Evaluasi Indonesia: sumber relevan, sitasi, jawaban tidak diketahui/abstention, prompt injection dan klaim kebijakan.
- Scope query tools, akses silang, data minimum, tujuan navigasi dan penghapusan percakapan.
- Biaya, latensi, batas pemakaian, retensi, kill switch dan ownership operasional.

Catat bukti pada [rencana aktif](RENCANA_ITASE_2026.md#gerbang-rilis); penulisan panduan ini tidak menjalankan pengujian atau mengaktifkan provider.

import type { SapReport } from "../../lib/api/client";
import type { PublicationSettings, PublicationSource } from "./types";
import { r1Error } from "../../lib/api/r1";

export function publicationError(error: unknown): string {
  const message = r1Error(error).trim();
  return message && !/^[\s"']+$/.test(message)
    ? message
    : "Permintaan belum berhasil. Coba lagi.";
}

export function publicationDate(value: string, locale = "id-ID") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { day: "Waktu tidak tersedia", time: "" };
  return {
    day: new Intl.DateTimeFormat(locale, { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "short", year: "numeric" }).format(date),
    time: `${new Intl.DateTimeFormat(locale, { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date).replace(".", ":")} WIB`,
  };
}
export function shortId(id: string) { return id.slice(0, 8); }
export function eligibleReport(report: SapReport) {
  return !!report.scanId && ["verified", "in_progress", "resolved"].includes(report.status)
    && !!report.publicSummary?.trim() && report.publishedMediaIds.length > 0;
}
export function buildCaption(source: PublicationSource, settings: PublicationSettings) {
  const text = settings.captionTemplate.replaceAll("{jenis_sampah}", source.categoryName)
    .replaceAll("{ringkasan_laporan}", source.publicSummary);
  const body = [text.trim(), settings.hashtags.trim()].filter(Boolean).join("\n\n");
  if (!source.publicUrl) return body;
  const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(source.occurredAt));
  return `${body}\n\n--- Status VERGO ---\nLaporan warga · bukti ditinjau moderator\nPengamatan: ${date} · ${source.area.label}\nKondisi dapat berubah. Status terbaru / koreksi:\n${source.publicUrl}`;
}
export function instagramPermalink(value: string | null): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && ["www.instagram.com", "instagram.com"].includes(url.hostname) && /^\/(p|reel)\//.test(url.pathname)) return url.href;
  } catch { /* Only known Instagram permalinks are exposed. */ }
}

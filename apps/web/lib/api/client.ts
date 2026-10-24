import type { components } from "./schema";

type Schema = components["schemas"];
export type SapUser = Schema["User"];
export type SapStats = Schema["Stats"];
export type SapScan = Schema["Scan"];
export type SapReport = Schema["Report"];
export type SapCategory = Schema["Category"];
export type SapAchievement = Schema["Achievement"];
export type SapAreas = Schema["Areas"];
export type SapAreaFeature = Schema["AreaFeature"];
export type SapAreaDetail = Schema["AreaDetail"];
export type SapPublicReport = Schema["PublicReport"];
export type SapChallenge = Schema["Challenge"];
export type SapLoginResult = Schema["LoginResult"];
export type SapMfaStatus = Schema["MfaStatus"];
export type SapMfaEnrollment = Schema["MfaEnrollment"];
export type SapMfaRecoveryCodes = Schema["MfaRecoveryCodes"];
export type SapMediaUrl = Schema["MediaUrl"];

type Envelope<T> = { data?: T; error?: { code?: string; message?: string; fields?: Record<string, string[]> } };

// The contract version this client was generated against (schema.d.ts). The API
// echoes X-Contract-Version on every response; a mismatch means the backend moved
// to a contract this build was not generated for, so surface it once for drift
// detection instead of failing silently.
const EXPECTED_CONTRACT_VERSION = "1.1.0";
let contractDriftWarned = false;

function checkContractVersion(response: Response) {
  if (contractDriftWarned) return;
  const seen = response.headers.get("x-contract-version");
  if (seen && seen !== EXPECTED_CONTRACT_VERSION) {
    contractDriftWarned = true;
    console.warn(`VERGO contract drift: UI expects ${EXPECTED_CONTRACT_VERSION}, API responded with ${seen}. Regenerate lib/api/schema.d.ts.`);
  }
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly fields?: Record<string, string[]>, public readonly retryAfter?: number) {
    super(message);
  }
}

let csrf: { token: string; expiresAt: number } | null = null;

export function clearApiSession() { csrf = null; }

async function readEnvelope<T>(response: Response): Promise<T> {
  checkContractVersion(response);
  let envelope: Envelope<T> | null = null;
  try { envelope = await response.json() as Envelope<T>; } catch { /* A proxy failure may not be JSON. */ }
  if (!response.ok) {
    const code = envelope?.error?.code || (response.status === 503 ? "BACKEND_UNAVAILABLE" : "REQUEST_FAILED");
    const message = envelope?.error?.message || "Permintaan belum berhasil. Coba lagi.";
    throw new ApiError(response.status, code, message, envelope?.error?.fields, Number(response.headers.get("retry-after")) || undefined);
  }
  if (!envelope || !("data" in envelope)) throw new ApiError(response.status, "INVALID_RESPONSE", "Respons API VERGO tidak lengkap.");
  return envelope.data as T;
}

export async function getCsrfToken(): Promise<string> {
  if (csrf && csrf.expiresAt > Date.now() + 30_000) return csrf.token;
  const data = await readEnvelope<Schema["Csrf"]>(await fetch("/api/v1/auth/csrf", { credentials: "include", cache: "no-store" }));
  csrf = { token: data.csrfToken, expiresAt: new Date(data.expiresAt).getTime() };
  return data.csrfToken;
}

type RequestOptions = { body?: unknown; signal?: AbortSignal; headers?: Record<string, string>; mutation?: boolean };

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return readEnvelope<T>(await fetch(`/api/v1${path}`, { credentials: "include", cache: "no-store", signal }));
}

export async function apiMutate<T>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getCsrfToken();
  const headers = new Headers(options.headers);
  headers.set("x-csrf-token", token);
  if (!(options.body instanceof FormData)) headers.set("content-type", "application/json");
  const body = options.body instanceof FormData ? options.body : options.body === undefined ? undefined : JSON.stringify(options.body);
  return readEnvelope<T>(await fetch(`/api/v1${path}`, { method, body, headers, credentials: "include", cache: "no-store", signal: options.signal }));
}

export const getMe = (signal?: AbortSignal) => apiGet<SapUser>("/auth/me", signal);
export async function login(email: string, password: string): Promise<SapLoginResult> {
  const result = await apiMutate<SapLoginResult>("POST", "/auth/login", { body: { email, password } });
  // Keep the CSRF token available during the second-factor challenge. It is
  // cleared only once the actual session has been issued.
  if (!("mfaRequired" in result)) clearApiSession();
  return result;
}

export async function completeMfaLogin(preauthToken: string, code: string): Promise<SapUser> {
  const user = await apiMutate<SapUser>("POST", "/auth/mfa/login", { body: { preauthToken, code } });
  clearApiSession();
  return user;
}

export const getMfaStatus = (signal?: AbortSignal) => apiGet<SapMfaStatus>("/auth/mfa", signal);
export const beginMfaEnrollment = () => apiMutate<SapMfaEnrollment>("POST", "/auth/mfa/enroll");
export const confirmMfaEnrollment = (code: string) => apiMutate<SapMfaRecoveryCodes>("POST", "/auth/mfa/enroll/confirm", { body: { code } });
export const regenerateMfaRecoveryCodes = (currentTotpCode: string) => apiMutate<SapMfaRecoveryCodes>("POST", "/auth/mfa/recovery-codes", { body: { currentTotpCode } });
export const disableMfa = (currentTotpCode: string) => apiMutate<Schema["Ack"]>("DELETE", "/auth/mfa", { body: { currentTotpCode } });

export type SapMfaRequired = Extract<SapLoginResult, { mfaRequired: true }>;
export function isMfaLoginRequired(result: SapLoginResult): result is SapMfaRequired {
  return "mfaRequired" in result;
}
export const register = (displayName: string, email: string, password: string) => apiMutate<SapChallenge>("POST", "/auth/register", { body: { displayName, email, password } });
export async function verifyEmail(challengeId: string, code: string): Promise<SapUser> {
  const user = await apiMutate<SapUser>("POST", "/auth/verify-email", { body: { challengeId, code } });
  clearApiSession();
  return user;
}
export const resendVerification = (email: string) => apiMutate<SapChallenge>("POST", "/auth/resend-verification", { body: { email } });
export const forgotPassword = (email: string) => apiMutate<SapChallenge>("POST", "/auth/forgot-password", { body: { email } });
export const resetPassword = (challengeId: string, code: string, newPassword: string) => apiMutate<Schema["Ack"]>("POST", "/auth/reset-password", { body: { challengeId, code, newPassword } });
export async function logout() {
  await apiMutate<Schema["Ack"]>("POST", "/auth/logout");
  clearApiSession();
}
export const updateProfile = (displayName: string) => apiMutate<SapUser>("PATCH", "/users/me", { body: { displayName } });
export const changePassword = (currentPassword: string, newPassword: string) => apiMutate<Schema["Ack"]>("PATCH", "/users/me/password", { body: { currentPassword, newPassword } });
export const setAvatar = (mediaId: string | null) => apiMutate<SapUser>("PATCH", "/users/me/avatar", { body: { mediaId } });
export const updateSapaPreference = (sapaEnabled: boolean) => apiMutate<Schema["UserPreferences"]>("PATCH", "/users/me/preferences", { body: { sapaEnabled } });
export const reauthenticate = (password: string) => apiMutate<Schema["Ack"]>("POST", "/auth/reauthenticate", { body: { password } });
export async function deleteAccount(): Promise<Schema["Deletion"]> {
  const result = await apiMutate<Schema["Deletion"]>("DELETE", "/users/me", { body: { confirmation: "DELETE_MY_ACCOUNT" }, headers: { "idempotency-key": crypto.randomUUID() } });
  clearApiSession();
  return result;
}

export const listCategories = (signal?: AbortSignal) => apiGet<Schema["CategoryPage"]>("/categories", signal);
export const getStats = (signal?: AbortSignal) => apiGet<SapStats>("/users/me/stats", signal);
export const getAchievements = (signal?: AbortSignal) => apiGet<Schema["AchievementPage"]>("/users/me/achievements", signal);
async function collectPages<T>(path: string, signal?: AbortSignal): Promise<{ items: T[]; nextCursor: null }> {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams({ limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const page: { items: T[]; nextCursor: string | null } = await apiGet(`${path}?${params}`, signal);
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return { items, nextCursor: null };
}
export const listScans = (signal?: AbortSignal) => collectPages<SapScan>("/scans", signal);
export const getScan = (id: string, signal?: AbortSignal) => apiGet<SapScan>(`/scans/${encodeURIComponent(id)}`, signal);
export const listReports = (signal?: AbortSignal) => collectPages<SapReport>("/reports/mine", signal);
export const getReport = (id: string, signal?: AbortSignal) => apiGet<SapReport>(`/reports/${encodeURIComponent(id)}`, signal);
export const updateReport = (id: string, revision: number, body: Schema["ReportUpdateInput"]) => apiMutate<SapReport>("PATCH", `/reports/${encodeURIComponent(id)}`, { body, headers: { "if-match": String(revision) } });
export const mediaUrl = (id: string, signal?: AbortSignal) => apiGet<SapMediaUrl>(`/media/${encodeURIComponent(id)}/url`, signal);

type MediaPurpose = "scan" | "report" | "avatar" | "community" | "resolution" | "activity_evidence";
type MediaUploadTicket = {
  mediaId: string;
  uploadUrl: string;
  method: "PUT";
  headers: { "Content-Type": "image/jpeg" | "image/png" | "image/webp" };
  expiresAt: string;
};

async function detectImageContentType(file: File): Promise<MediaUploadTicket["headers"]["Content-Type"]> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") return "image/webp";
  throw new ApiError(415, "UNSUPPORTED_IMAGE", "Hanya JPEG, PNG, atau WebP yang didukung.");
}

export async function uploadMedia(file: File, purpose: MediaPurpose, signal?: AbortSignal): Promise<Schema["Media"]> {
  if (file.size < 1 || file.size > 10 * 1024 * 1024) {
    throw new ApiError(413, "IMAGE_TOO_LARGE", "Berkas harus berukuran maksimal 10 MiB.");
  }
  const contentType = await detectImageContentType(file);

  const ticket = await apiMutate<MediaUploadTicket>("POST", "/media/uploads", {
    body: { purpose, contentType, sizeBytes: file.size },
    signal,
  });
  const uploaded = await fetch(ticket.uploadUrl, {
    method: ticket.method,
    headers: ticket.headers,
    body: file,
    cache: "no-store",
    signal,
  });
  if (!uploaded.ok) {
    throw new ApiError(uploaded.status, "MEDIA_STORAGE_UPLOAD_FAILED", "Foto belum berhasil dikirim ke penyimpanan. Coba lagi.");
  }
  return apiMutate<Schema["Media"]>("POST", `/media/${encodeURIComponent(ticket.mediaId)}/complete`, { signal });
}

export async function createScan(mediaId: string, idempotencyKey: string, signal?: AbortSignal): Promise<SapScan> {
  return apiMutate<SapScan>("POST", "/scans", { body: { mediaId }, headers: { "idempotency-key": idempotencyKey }, signal });
}

export type ReportInput = Schema["ReportInput"];
export async function createReport(input: ReportInput, idempotencyKey: string): Promise<SapReport> {
  return apiMutate<SapReport>("POST", "/reports", { body: input, headers: { "idempotency-key": idempotencyKey } });
}

export async function listAreas(bbox: string, from: string, to: string, categoryId?: string, signal?: AbortSignal): Promise<SapAreas> {
  const params = new URLSearchParams({ bbox, from, to });
  if (categoryId) params.set("categoryId", categoryId);
  return apiGet<SapAreas>(`/areas?${params}`, signal);
}
export async function getArea(cellId: string, from: string, to: string, categoryId?: string, signal?: AbortSignal): Promise<SapAreaDetail> {
  const params = new URLSearchParams({ from, to });
  if (categoryId) params.set("categoryId", categoryId);
  return apiGet<SapAreaDetail>(`/areas/${encodeURIComponent(cellId)}?${params}`, signal);
}

// --- Admin (role-gated; API also enforces admin via SessionAuthGuard + AdminGuard). ---
export type SapReportStatus = SapReport["status"];
export type SapAdminStats = Schema["AdminStats"];
export type SapAuditEvent = Schema["AuditEvent"];
export type SapDuplicateCandidate = Schema["DuplicateCandidate"];
export type SapScanSettings = Schema["ScanSettings"];
export type ScanSettingsUpdate = Schema["ScanSettingsUpdateInput"];
export type DecisionInput = Schema["DecisionInput"];

export async function listAdminReports(status?: SapReportStatus, cursor?: string, signal?: AbortSignal): Promise<Schema["ReportPage"]> {
  const params = new URLSearchParams({ limit: "50" });
  if (status) params.set("status", status);
  if (cursor) params.set("cursor", cursor);
  return apiGet<Schema["ReportPage"]>(`/admin/reports?${params}`, signal);
}
export const getReportDuplicates = (reportId: string, signal?: AbortSignal) =>
  apiGet<Schema["DuplicateCandidatePage"]>(`/admin/reports/${encodeURIComponent(reportId)}/duplicates`, signal);
export const askReportEvidence = (reportId: string, message: string) =>
  apiMutate<{reportId:string;notified:boolean}>("POST", `/admin/reports/${encodeURIComponent(reportId)}/evidence-requests`, {
    body: { message }, headers: { "idempotency-key": crypto.randomUUID() },
  });
export const decideReport = (reportId: string, revision: number, input: DecisionInput) =>
  apiMutate<SapReport>("POST", `/admin/reports/${encodeURIComponent(reportId)}/decisions`, {
    body: input,
    headers: { "idempotency-key": crypto.randomUUID(), "if-match": String(revision) },
  });
export const getAdminStats = (signal?: AbortSignal) => apiGet<SapAdminStats>("/admin/stats", signal);
export async function listAuditEvents(cursor?: string, signal?: AbortSignal): Promise<Schema["AuditEventPage"]> {
  const params = new URLSearchParams({ limit: "50" });
  if (cursor) params.set("cursor", cursor);
  return apiGet<Schema["AuditEventPage"]>(`/admin/audit?${params}`, signal);
}
export const getScanSettings = (signal?: AbortSignal) => apiGet<SapScanSettings>("/admin/scan-settings", signal);
export const updateScanSettings = (patch: ScanSettingsUpdate) =>
  apiMutate<SapScanSettings>("PUT", "/admin/scan-settings", { body: patch });

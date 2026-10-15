import { expect, test, type Page, type Route } from "@playwright/test";
import { fixtureApi, ids, json, time } from "./r1-fixtures";
import type { R1 } from "../lib/api/r1";

type Notification = R1["Notification"];
const first: Notification = { id: ids.incident, type: "evidence_requested", title: "Tambahkan bukti laporan", message: "Moderator meminta foto kondisi terbaru.", targetPath: "/dashboard?view=reports", read: false, createdAt: time };
const second: Notification = { ...first, id: ids.activity, type: "activity_changed", title: "Kegiatan diperbarui", targetPath: `/activities/${ids.activity}`, read: true };
const preferencePath = "/users/me/report-notification-preferences";
const inboxPath = "/users/me/notifications";
async function unavailable(route: Route, message: string) {
  await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "BACKEND_UNAVAILABLE", message } }) });
}
async function setup(page: Page, options: { items?: Notification[]; cursor?: string | null; handler?: (route: Route, path: string) => Promise<boolean> } = {}) {
  return fixtureApi(page, { role: "admin", handler: async (route, path) => {
    if (await options.handler?.(route, path)) return true;
    if (path === preferencePath) { await json(route, { emailEnabled: false }); return true; }
    if (path === inboxPath) { await json(route, { items: options.items ?? [], nextCursor: options.cursor ?? null }); return true; }
    return false;
  } });
}

test("empty inbox matches the design and does not enable email or send actions", async ({ page }, info) => {
  const requests = await setup(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dashboard?view=notifications");
  await expect(page.getByRole("heading", { name: "Notifikasi", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Belum ada notifikasi", exact: true })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Notifikasi laporan melalui email" })).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Simpan preferensi" })).toBeDisabled();
  await expect(page.getByText("Email nonaktif", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lihat laporan saya" })).toHaveAttribute("href", "/dashboard?view=reports");
  const artwork = page.locator('img[src*="empty-bell"]');
  await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.id === "sap-entry").length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath(`notifications-empty-${info.project.name}.png`), fullPage: true });
  await page.getByRole("link", { name: "Lihat laporan saya" }).click();
  await expect(page).toHaveURL(/view=reports/);
  expect(requests.filter(request => !["GET", "HEAD"].includes(request.method))).toEqual([]);
  expect(errors).toEqual([]);
});

test("read changes wait for the server and update the unread filter", async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requests = await setup(page, { items: [first, second], handler: async (route, path) => {
    if (path === `${inboxPath}/${first.id}/read`) { await gate; await json(route, { ...first, read: true }); return true; }
    return false;
  } });
  await page.goto("/dashboard?view=notifications");
  const inbox = page.getByRole("region", { name: "Daftar notifikasi", exact: true });
  await expect(inbox.getByRole("listitem")).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.id === "sap-entry").length)).toBe(0);
  await page.screenshot({ path: test.info().outputPath("notifications-populated.png"), fullPage: true });
  await inbox.getByRole("button", { name: "Belum dibaca", exact: true }).click();
  await expect(inbox.getByRole("listitem")).toHaveCount(1);
  await inbox.getByRole("button", { name: "Tandai dibaca", exact: true }).click();
  await expect(inbox.getByRole("button", { name: "Tandai dibaca", exact: true })).toBeDisabled();
  await expect(inbox.getByRole("heading", { name: first.title })).toBeVisible();
  release();
  await expect(inbox.getByRole("heading", { name: "Tidak ada notifikasi belum dibaca" })).toBeVisible();
  await inbox.getByRole("button", { name: "Lihat semua notifikasi" }).click();
  await expect(inbox.getByRole("listitem")).toHaveCount(2);
  await expect(inbox.getByRole("button", { name: "Tandai belum dibaca" })).toHaveCount(2);
  const writes = requests.filter(request => request.method === "PUT");
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ path: `${inboxPath}/${first.id}/read`, body: { read: true } });
});

test("pagination keeps loaded counts honest and deduplicates overlapping pages", async ({ page }) => {
  const third = { ...first, id: ids.update, title: "Hasil kegiatan disetujui" };
  const requests = await setup(page, { items: [first, second], cursor: "next-test-page", handler: async (route, path) => {
    if (path === inboxPath && new URL(route.request().url()).searchParams.get("cursor")) {
      await json(route, { items: [{ ...first, title: "Bukti terbaru diminta" }, third], nextCursor: null }); return true;
    }
    return false;
  } });
  await page.goto("/dashboard?view=notifications");
  const inbox = page.getByRole("region", { name: "Daftar notifikasi", exact: true });
  await expect(inbox.getByText("2 dimuat", { exact: true })).toBeVisible();
  await expect(inbox.getByText("Jumlah sesuai notifikasi yang sudah dimuat.")).toBeVisible();
  await inbox.getByRole("button", { name: "Muat lagi" }).click();
  await expect(inbox.getByRole("listitem")).toHaveCount(3);
  await expect(inbox.getByRole("heading", { name: "Bukti terbaru diminta" })).toHaveCount(1);
  await expect(inbox.getByRole("button", { name: "Muat lagi" })).toHaveCount(0);
  await expect(inbox.getByText("3 notifikasi", { exact: true })).toBeVisible();
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("email drafts require an explicit save and survive a failed save and retry", async ({ page }) => {
  let saves = 0, release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requests = await setup(page, { handler: async (route, path) => {
    if (path === preferencePath && route.request().method() === "PUT") {
      saves++;
      if (saves === 1) { await gate; await unavailable(route, "Penyimpanan sementara gagal."); }
      else await json(route, { emailEnabled: true });
      return true;
    }
    return false;
  } });
  await page.goto("/dashboard?view=notifications");
  const preference = page.getByRole("form", { name: "Preferensi email" });
  const toggle = page.getByRole("switch", { name: "Notifikasi laporan melalui email" });
  await expect(toggle).toBeEnabled();
  await toggle.check();
  await expect(preference.getByText("Perubahan belum disimpan.")).toBeVisible();
  expect(requests.filter(request => request.method === "PUT")).toHaveLength(0);
  await preference.getByRole("button", { name: "Simpan preferensi" }).click();
  await expect(toggle).toBeDisabled();
  await expect(preference.getByRole("button", { name: "Menyimpan preferensi..." })).toBeDisabled();
  release();
  await expect(preference.getByRole("alert")).toContainText("Penyimpanan sementara gagal.");
  await expect(toggle).toBeChecked();
  await expect(preference.getByText("Email nonaktif", { exact: true })).toBeVisible();
  await preference.getByRole("button", { name: "Coba lagi" }).click();
  await expect(preference.getByText("Email aktif", { exact: true })).toBeVisible();
  await expect(preference.getByRole("status")).toHaveText("Preferensi notifikasi tersimpan.");
  await expect(preference.getByRole("button", { name: "Simpan preferensi" })).toBeDisabled();
  expect(requests.filter(request => request.method === "PUT").map(request => request.body)).toEqual([{ emailEnabled: true }, { emailEnabled: true }]);
});

test("loading and failed requests never masquerade as an empty inbox or an email opt-out", async ({ page }) => {
  let inboxFails = true, preferenceFails = true, release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requests = await setup(page, { handler: async (route, path) => {
    if (path === inboxPath && inboxFails) { await gate; await unavailable(route, "Notifikasi belum dapat dimuat."); return true; }
    if (path === preferencePath && preferenceFails) { await gate; await unavailable(route, "Preferensi belum dapat dimuat."); return true; }
    return false;
  } });
  await page.goto("/dashboard?view=notifications");
  await expect(page.getByRole("switch")).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Belum ada notifikasi", exact: true })).toHaveCount(0);
  await expect(page.getByText("Email nonaktif", { exact: true })).toHaveCount(0);
  release();
  const inbox = page.getByRole("region", { name: "Daftar notifikasi", exact: true });
  const preference = page.getByRole("form", { name: "Preferensi email" });
  await expect(inbox.getByRole("alert")).toContainText("Notifikasi belum dapat dimuat.");
  await expect(preference.getByText("Preferensi belum tersedia", { exact: true })).toBeVisible();
  inboxFails = false;
  await inbox.getByRole("button", { name: "Coba lagi" }).click();
  await expect(inbox.getByRole("heading", { name: "Belum ada notifikasi", exact: true })).toBeVisible();
  preferenceFails = false;
  await preference.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.getByRole("switch")).toBeEnabled();
  await expect(preference.getByText("Email nonaktif", { exact: true })).toBeVisible();
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("notification links retain validated local targets and reject external or encoded redirects", async ({ page }) => {
  const cases = ["https://outside.invalid/", "//outside.invalid", "/%2foutside.invalid", "/%5coutside.invalid", "/dashboard?view=community-updates", `/activities/${ids.activity}/manage`, `/incidents/${ids.incident}?from=notification`];
  await setup(page, { items: cases.map((targetPath, index) => ({ ...first, id: `test-${index}`, title: `Tujuan ${index}`, targetPath, read: true })) });
  await page.goto("/dashboard?view=notifications");
  const items = page.getByRole("region", { name: "Daftar notifikasi", exact: true }).getByRole("listitem");
  await expect(items).toHaveCount(cases.length);
  for (let index = 0; index < 4; index++) await expect(items.nth(index).getByRole("link", { name: "Buka" })).toHaveCount(0);
  await expect(items.nth(4).getByRole("link", { name: "Buka" })).toHaveAttribute("href", "/dashboard?view=reports");
  await expect(items.nth(5).getByRole("link", { name: "Buka" })).toHaveAttribute("href", cases[5]);
  await expect(items.nth(6).getByRole("link", { name: "Buka" })).toHaveAttribute("href", cases[6]);
});

test("notification layout fits small and large screens in both languages", async ({ page }, info) => {
  await setup(page);
  for (const width of [320, 390, 768, 1024, 1280, 1672]) for (const locale of ["id", "en"]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.context().addCookies([{ name: "sap_locale", value: locale, url: info.project.use.baseURL! }]);
    await page.goto("/dashboard?view=notifications");
    await expect(page.getByRole("heading", { name: locale === "id" ? "Belum ada notifikasi" : "No notifications yet", exact: true })).toBeVisible();
    await expect(page.getByRole("switch")).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px ${locale}`).toBe(true);
  }
});

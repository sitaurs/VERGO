import { expect, test, type Page, type Route } from "@playwright/test";
import { failure, fixtureApi, ids, json, time } from "./r1-fixtures";
import type { OperationReport } from "../components/operations/admin-operations";

const endpoint = "/users/me/report-assignments";
const active: OperationReport = { id: ids.incident, revision: 2, status: "verified", description: "Penanganan sampah di taman · TEST", categoryId: "plastic", lat: null, lon: null, createdAt: time, updatedAt: time, assignment: { assigneeId: ids.canonical, assigneeName: "Petugas tes", dueAt: time, note: "Tinjau lokasi dan catat hasil penanganan.", revision: 7, progress: "working", progressNote: "Tim sedang memilah sampah.", overdue: true, completed: false } };
const done: OperationReport = { ...active, id: ids.activity, description: "Tugas selesai · TEST", assignment: { ...active.assignment!, progress: "done", completed: true, overdue: false } };
const closed: OperationReport = { ...active, id: ids.update, description: "Laporan sudah ditutup · TEST", status: "resolved", assignment: { ...active.assignment!, progress: "accepted", completed: true, overdue: false, dueAt: null } };
async function setup(page: Page, options: { items?: OperationReport[]; cursor?: string | null; handler?: (route: Route, path: string) => Promise<boolean> } = {}) {
  return fixtureApi(page, { role: "admin", handler: async (route, path) => {
    if (await options.handler?.(route, path)) return true;
    if (path === endpoint) { await json(route, { items: options.items ?? [], nextCursor: options.cursor ?? null }); return true; }
    if (path === "/users/me/notifications") { await json(route, { items: [], nextCursor: null }); return true; }
    if (path === "/users/me/report-notification-preferences") { await json(route, { emailEnabled: false }); return true; }
    return false;
  } });
}
const list = (page: Page) => page.getByRole("region", { name: "Daftar tugas laporan", exact: true });
async function settled(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.id === "sap-entry").length)).toBe(0);
}

test("empty assignment workspace matches the design and notifications link works without writes", async ({ page }, info) => {
  const requests = await setup(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dashboard?view=assignments");
  await expect(page.getByRole("heading", { name: "Tugas laporan saya", exact: true })).toBeVisible();
  await expect(list(page).getByRole("heading", { name: "Belum ada tugas laporan", exact: true })).toBeVisible();
  await expect(list(page).getByRole("button", { name: "Semua 0", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("complementary", { name: "Alur penugasan" }).getByRole("listitem")).toHaveCount(3);
  await expect(list(page).getByText("0 tugas ditampilkan", { exact: true })).toBeVisible();
  const artwork = page.locator('img[src*="empty-clipboard"]');
  await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await settled(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath(`assignments-empty-${info.project.name}.png`), fullPage: true });
  await page.getByRole("link", { name: "Lihat notifikasi" }).click();
  await expect(page).toHaveURL(/view=notifications/);
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
  expect(errors).toEqual([]);
});

test("filters follow server completion and closed reports cannot update progress", async ({ page }) => {
  const requests = await setup(page, { items: [active, done, closed] });
  await page.goto("/dashboard?view=assignments");
  await expect(list(page).getByRole("listitem")).toHaveCount(3);
  await expect(list(page).getByText("Lewat tenggat", { exact: true })).toHaveCount(1);
  await expect(list(page).getByText("Belum ditentukan", { exact: true })).toBeVisible();
  await expect(list(page).getByRole("button", { name: "Perbarui progres" })).toHaveCount(1);
  await list(page).getByRole("button", { name: "Selesai 2", exact: true }).click();
  await expect(list(page).getByRole("listitem")).toHaveCount(2);
  await expect(list(page).getByRole("button", { name: "Perbarui progres" })).toHaveCount(0);
  await list(page).getByRole("button", { name: "Tugas aktif 1", exact: true }).click();
  await expect(list(page).getByRole("listitem")).toHaveCount(1);
  await expect(list(page).getByRole("heading", { name: active.description })).toBeVisible();
  await expect(list(page).getByText("1 tugas ditampilkan", { exact: true })).toBeVisible();
  await settled(page);
  await page.screenshot({ path: test.info().outputPath("assignments-populated.png"), fullPage: true });
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("loading and failure are distinct from an empty assignment list and support retry", async ({ page }) => {
  let fail = true, release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await setup(page, { handler: async (route, path) => {
    if (path === endpoint && fail) { await gate; await failure(route, 503, "TEMPORARILY_UNAVAILABLE"); return true; }
    return false;
  } });
  await page.goto("/dashboard?view=assignments");
  await expect(list(page).getByRole("status")).toHaveText("Memuat tugas...");
  await expect(list(page).getByRole("button", { name: "Semua —" })).toBeVisible();
  await expect(list(page).getByRole("heading", { name: "Belum ada tugas laporan" })).toHaveCount(0);
  release();
  await expect(list(page).getByRole("alert")).toContainText("TEMPORARILY_UNAVAILABLE");
  await expect(list(page).getByText("Tugas belum tersedia", { exact: true })).toBeVisible();
  await expect(list(page).getByRole("heading", { name: "Belum ada tugas laporan" })).toHaveCount(0);
  fail = false;
  await list(page).getByRole("button", { name: "Coba lagi" }).click();
  await expect(list(page).getByRole("heading", { name: "Belum ada tugas laporan" })).toBeVisible();
});

test("pagination is deduplicated, counts only loaded tasks and retries the failed next page", async ({ page }) => {
  let nextAttempts = 0;
  const requests = await setup(page, { items: [active], cursor: "next-page", handler: async (route, path) => {
    if (path === endpoint && new URL(route.request().url()).searchParams.has("cursor")) {
      if (++nextAttempts === 1) await failure(route, 503, "NEXT_PAGE_UNAVAILABLE");
      else await json(route, { items: [{ ...active, description: "Penanganan diperbarui · TEST" }, done], nextCursor: null });
      return true;
    }
    return false;
  } });
  await page.goto("/dashboard?view=assignments");
  await expect(list(page).getByText("1 tugas dimuat", { exact: true })).toBeVisible();
  await expect(list(page).getByText("Jumlah sesuai tugas yang sudah dimuat.")).toBeVisible();
  await list(page).getByRole("button", { name: "Selesai 0", exact: true }).click();
  await expect(list(page).getByRole("heading", { name: "Belum ada tugas selesai" })).toBeVisible();
  await list(page).getByRole("button", { name: "Muat lagi" }).click();
  await expect(list(page).getByRole("alert")).toContainText("NEXT_PAGE_UNAVAILABLE");
  await expect(list(page).getByRole("button", { name: "Semua 1", exact: true })).toBeVisible();
  await list(page).getByRole("button", { name: "Coba lagi" }).click();
  await expect(list(page).getByRole("listitem")).toHaveCount(1);
  await expect(list(page).getByRole("heading", { name: done.description })).toBeVisible();
  await list(page).getByRole("button", { name: "Semua 2", exact: true }).click();
  await expect(list(page).getByRole("listitem")).toHaveCount(2);
  await expect(list(page).getByRole("heading", { name: "Penanganan diperbarui · TEST" })).toHaveCount(1);
  await expect(list(page).getByRole("button", { name: "Muat lagi" })).toHaveCount(0);
  expect(nextAttempts).toBe(2);
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("progress requires notes and review, preserves revision and reuses the retry idempotency key", async ({ page }) => {
  let saved = false, attempts = 0, release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requests = await setup(page, { handler: async (route, path) => {
    if (path === `${endpoint}/${active.id}/progress`) {
      attempts++;
      if (attempts === 1) { await gate; await failure(route, 503, "TRY_AGAIN"); }
      else { saved = true; await json(route, { reportId: active.id, revision: 8, progress: "done" }); }
      return true;
    }
    if (path === endpoint) { await json(route, { items: [saved ? { ...active, assignment: { ...active.assignment!, progress: "done", progressNote: "Penanganan telah selesai.", completed: true, overdue: false, revision: 8 } } : active], nextCursor: null }); return true; }
    return false;
  } });
  await page.goto("/dashboard?view=assignments");
  await list(page).getByRole("button", { name: "Perbarui progres" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Progres tugas").locator("option")).toHaveCount(2);
  await dialog.getByLabel("Progres tugas").selectOption("done");
  await dialog.getByLabel("Catatan progres").fill("abc");
  await expect(dialog.getByRole("button", { name: "Tinjau progres" })).toBeDisabled();
  await dialog.getByLabel("Catatan progres").fill("Penanganan telah selesai.");
  await dialog.getByRole("button", { name: "Tinjau progres" }).click();
  expect(requests.filter(request => request.method === "PUT")).toHaveLength(0);
  await dialog.getByRole("button", { name: "Konfirmasi progres", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Batal" })).toBeDisabled();
  release();
  await expect(dialog.getByRole("alert")).toContainText("TRY_AGAIN");
  await dialog.getByRole("button", { name: "Konfirmasi progres", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Progres tugas diperbarui.");
  await expect(list(page).getByRole("button", { name: "Perbarui progres" })).toHaveCount(0);
  const writes = requests.filter(request => request.method === "PUT");
  expect(writes).toHaveLength(2);
  expect(writes[0]).toMatchObject({ path: `${endpoint}/${active.id}/progress`, body: { progress: "done", note: "Penanganan telah selesai." }, revision: "7" });
  expect(writes[0].key).toMatch(/^[0-9a-f-]{36}$/);
  expect(writes[1].key).toBe(writes[0].key);
});

test("a conflicting progress revision blocks resubmission and reloads current assignment", async ({ page }) => {
  let conflict = false;
  const requests = await setup(page, { handler: async (route, path) => {
    if (path === `${endpoint}/${active.id}/progress`) { conflict = true; await failure(route, 412, "STALE_REVISION"); return true; }
    if (path === endpoint) { await json(route, { items: [conflict ? { ...active, assignment: { ...active.assignment!, revision: 8, progress: "done", completed: true } } : active], nextCursor: null }); return true; }
    return false;
  } });
  await page.goto("/dashboard?view=assignments");
  await list(page).getByRole("button", { name: "Perbarui progres" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Catatan progres").fill("Catatan kondisi paling baru.");
  await dialog.getByRole("button", { name: "Tinjau progres" }).click();
  await dialog.getByRole("button", { name: "Konfirmasi progres", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Progres tugas telah berubah.");
  await expect(dialog.getByRole("button", { name: "Konfirmasi progres", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Muat ulang laporan" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(list(page).getByRole("button", { name: "Selesai 1", exact: true })).toBeVisible();
  expect(requests.filter(request => request.method === "PUT")).toHaveLength(1);
});

test("empty filter reset, keyboard focus, English copy and narrow layouts remain usable", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Responsive matrix runs once; other tests cover both devices.");
  const long = { ...active, description: "Lokasi laporan dengan keterangan sangat panjang ".repeat(9), assignment: { ...active.assignment!, note: "KeteranganTanpaSpasi".repeat(40), progressNote: "Penanganan dengan catatan panjang ".repeat(12) } };
  await setup(page, { items: [long] });
  await page.goto("/dashboard?view=assignments");
  await list(page).getByRole("button", { name: "Selesai 0", exact: true }).click();
  await list(page).getByRole("button", { name: "Lihat semua tugas" }).click();
  await expect(list(page).getByRole("listitem")).toHaveCount(1);
  const filter = list(page).getByRole("button", { name: "Tugas aktif 1", exact: true });
  await filter.focus(); await page.keyboard.press("Enter");
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  for (const locale of ["id", "en"]) {
    await page.context().addCookies([{ name: "sap_locale", value: locale, domain: "127.0.0.1", path: "/" }]);
    await page.reload();
    await expect(page.getByRole("heading", { name: locale === "id" ? "Tugas laporan saya" : "My report assignments", exact: true })).toBeVisible();
    for (const width of [320, 390, 768, 1024, 1280, 1672]) {
      await page.setViewportSize({ width, height: 1000 });
      await settled(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale} at ${width}px`).toBe(true);
    }
  }
  await expect(page.getByText("Counts reflect assignments loaded so far.")).toHaveCount(0);
});

import { expect, test, type Page } from "@playwright/test";
import { cellToBoundary, gridDisk, latLngToCell } from "h3-js";
import { fixtureApi, json, failure, ids } from "./r1-fixtures";

const center = latLngToCell(-7.9797, 112.6304, 9);
const features = gridDisk(center, 1).map((cellId, index) => {
  const ring = cellToBoundary(cellId, true);
  ring.push(ring[0]);
  return { type: "Feature", id: cellId, geometry: { type: "Polygon", coordinates: [ring] }, properties: {
    cellId, riskLevel: index === 0 ? "high" : index === 1 ? "medium" : "low",
    incidentCount: index + 1, openIncidentCount: index + 1, resolvedIncidentCount: 0, distinctDays: 1,
  } };
});
const metadata = { from: "2026-10-01T00:00:00Z", to: "2026-10-16T00:00:00Z", asOf: "2026-10-16T03:00:00Z", methodVersion: "reports-h3-v1", isStale: false };

async function fixture(page: Page, options: { error?: boolean; empty?: boolean; live?: boolean } = {}) {
  let fail = options.error;
  const ranges: URLSearchParams[] = [];
  const requests = await fixtureApi(page, { guest: true, handler: async (route, path) => {
    if (path === "/areas") {
      ranges.push(new URL(route.request().url()).searchParams);
      if (fail) { await failure(route, 503, "DEPENDENCY_UNAVAILABLE"); }
      else await json(route, { type: "FeatureCollection", features: options.empty ? [] : features, ...metadata });
      return true;
    }
    if (path === "/area-localities") {
      await json(route, { items: features.map((feature, index) => ({ cellId: feature.id, label: `Area sintetis ${index + 1}` })) }); return true;
    }
    const item = features.find(feature => path === `/areas/${feature.id}`);
    if (item) { await json(route, { feature: item, ...metadata }); return true; }
    if (/^\/areas\/[^/]+\/reports$/.test(path)) { await json(route, { items: [{ id: ids.incident, summary: "Kejadian publik sintetis", status: "verified", categoryId: "plastic", occurredAt: metadata.asOf, publicMediaUrl: null }], nextCursor: null }); return true; }
    return false;
  } });
  if (!options.live) await page.route("**/api/map-config", route => route.fulfill({ status: 503, json: { available: false } }));
  await page.route("https://*.tile.openstreetmap.org/**", route => route.abort());
  return { requests, ranges, recover: () => { fail = false; } };
}

test("landing loads all areas, searches names and preserves public incident access in 2D fallback", async ({ page }) => {
  const { requests } = await fixture(page);
  await page.goto("/");
  const section = page.locator("#peta");
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator('[data-map-mode="fallback"]')).toBeVisible();
  await expect(section.locator('button[data-selected]')).toHaveCount(7);
  await expect(section.getByText("7 area", { exact: true })).toBeVisible();
  await section.getByRole("searchbox").fill("Area sintetis 7");
  await expect(section.locator('button[data-selected]')).toHaveCount(1);
  await section.locator('button[data-selected]').click();
  await expect(section.locator('button[data-selected="true"]')).toContainText("Area sintetis 7");
  await expect(section.getByRole("region", { name: "Kejadian publik pada area" })).toBeVisible();
  await expect(section.getByRole("link", { name: "Kejadian publik sintetis" })).toHaveAttribute("href", `/incidents/${ids.incident}`);
  await section.getByRole("searchbox").fill("no-such-area");
  await expect(section.getByText("Tidak ada area yang cocok. Coba nama atau ID lain.")).toBeVisible();
  await section.getByRole("searchbox").fill("");
  await expect(section.locator('button[data-selected]')).toHaveCount(7);
  expect(requests.every(request => request.method === "GET")).toBe(true);
});

test("period changes clear selection, query real date ranges, and never change account data", async ({ page }) => {
  const { ranges, requests } = await fixture(page);
  await page.goto("/#peta");
  await page.locator('#peta button[data-selected]').first().click();
  await expect(page.locator('#peta button[data-selected="true"]')).toHaveCount(1);
  for (const days of [7, 90, 30]) {
    await page.getByRole("combobox", { name: "Periode laporan" }).selectOption(String(days));
    await expect.poll(() => {
      const last = ranges.at(-1);
      return last ? Math.round((Date.parse(last.get("to")!) - Date.parse(last.get("from")!)) / 86_400_000) : 0;
    }).toBe(days);
    await expect(page.locator('#peta button[data-selected="true"]')).toHaveCount(0);
  }
  expect(requests.every(request => request.method === "GET")).toBe(true);
});

test("data errors are recoverable without claiming no reports or a clean area", async ({ page }) => {
  const { recover } = await fixture(page, { error: true });
  await page.goto("/#peta");
  await expect(page.locator("#peta").getByRole("alert")).toContainText("Ringkasan area belum dapat dimuat");
  await page.locator("#peta").getByRole("button", { name: "Coba lagi", exact: true }).click();
  recover();
  await expect(page.locator('#peta button[data-selected]')).toHaveCount(7);
  await expect(page.locator("#peta").getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("Area tanpa data belum tentu bebas sampah.", { exact: true })).toBeVisible();
});

test("empty period and narrow screens remain useful in both languages", async ({ page }, info) => {
  await fixture(page, { empty: true });
  for (const width of info.project.name === "mobile" ? [320, 390] : [760, 761, 1024, 1600]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const locale of ["id", "en"]) {
      await page.context().addCookies([{ name: "sap_locale", value: locale, url: info.project.use.baseURL! }]);
      await page.goto(`/?map-layout=${width}-${locale}#peta`);
      const section = page.locator("#peta");
      await expect(section.getByText(locale === "id" ? "Belum ada laporan terverifikasi untuk area yang terlihat pada peta." : "No verified reports for the area currently visible on the map.")).toBeVisible();
      await expect(section.getByRole("heading", { level: 2 })).toHaveText(locale === "id" ? "Peta laporan sampah" : "Waste report map");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(section.getByRole("button", { name: "3D", exact: true })).toBeDisabled();
    }
  }
});

test("a rejected Mapbox token falls back without breaking public API summaries", async ({ page }) => {
  await fixture(page, { live: true });
  await page.route("**/api/map-config", route => route.fulfill({ json: { available: true, publicToken: "pk.synthetic.not-a-real-token" } }));
  await page.route("https://api.mapbox.com/**", route => route.fulfill({ status: 401, json: { message: "Unauthorized" } }));
  await page.goto("/#peta");
  await expect(page.locator('[data-map-mode="fallback"]')).toBeVisible({ timeout: 35_000 });
  await expect(page.locator('#peta button[data-selected]')).toHaveCount(7);
  await expect(page.getByRole("button", { name: "Coba 3D lagi" })).toBeEnabled();
});

test("real Mapbox renders aggregate polygons, map clicks and 2D/3D cameras", async ({ page }, info) => {
  test.skip(process.env.VERGO_TEST_MAPBOX_LIVE !== "1", "Opt-in real Mapbox network/WebGL verification; traces must be disabled to protect token URLs.");
  test.setTimeout(100_000);
  if (info.project.use.trace !== "off") throw new Error("Disable Playwright traces before live Mapbox verification; browser request URLs contain a public token.");
  await fixture(page, { live: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.name));
  await page.goto("/#peta");
  const canvas = page.locator('[data-map-ready="true"]');
  await expect(page.locator('[data-map-ready="true"], [data-map-mode="fallback"]')).toBeVisible({ timeout: 55_000 });
  if (await page.locator('[data-map-mode="fallback"]').count()) await page.getByRole("button", { name: "Coba 3D lagi" }).click();
  await expect(canvas).toBeVisible({ timeout: 55_000 });
  const box = (await canvas.boundingBox())!;
  expect(box.height).toBeGreaterThan(400);
  await expect(canvas).toHaveAttribute("data-pitch", "48.0");
  await page.locator("#peta").getByRole("button", { name: "2D", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-pitch", "0.0");
  await page.locator("#peta").getByRole("button", { name: "3D", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-pitch", "48.0");
  // At 2D with north up, the first aggregate cell covers the canonical map center.
  await page.locator("#peta").getByRole("button", { name: "2D", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-pitch", "0.0");
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(page.locator('#peta button[data-selected="true"]')).toContainText("Area sintetis 1");
  await page.locator("#peta").getByRole("button", { name: "3D", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-pitch", "48.0");
  await expect(canvas).toHaveAttribute("data-map-idle", "true", { timeout: 30_000 });
  await page.locator("#peta").screenshot({ path: info.outputPath("real-mapbox-3d.png") });
  await page.getByRole("button", { name: "Kembali ke Malang" }).click();
  await expect(page.locator('#peta button[data-selected="true"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

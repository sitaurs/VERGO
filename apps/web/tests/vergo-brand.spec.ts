import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { translate } from "../lib/i18n/translate";
import { activity, fixtureApi, ids } from "./r1-fixtures";

test("brand aliases translate static copy while preserving supplied content and assistant compatibility", () => {
  expect(translate("en", "Pilih bahasa tampilan VERGO.")).toBe("Choose your VERGO display language.");
  expect(translate("en", "Pilih bahasa tampilan SAP.")).toBe("Choose your VERGO display language.");
  expect(translate("id", "Tentang VERGO")).toBe("Tentang VERGO");
  expect(translate("en", "Buka chat VERA")).toBe("Open VERA chat");
  expect(translate("en", "Buka chat SAPA")).toBe("Open VERA chat");
  expect(translate("en", "Pertanyaan warga mengenai SAPA.")).toBe("Pertanyaan warga mengenai SAPA.");
  expect(translate("en", "Akun {0}", { "0": "SAP Warga" })).toBe("Account of SAP Warga");
  expect(translate("en", activity.description)).toBe(activity.description);
  expect(translate("en", "https://sap.venlab.tech/api/v1")).toBe("https://sap.venlab.tech/api/v1");
});

test("metadata, share card and browser icons use the approved identity in both languages", async ({ request }) => {
  for (const locale of ["en", "id"]) {
    const response = await request.get("/login", { headers: { Cookie: `sap_locale=${locale}` } });
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain(`<html lang="${locale}"`);
    expect(html).toContain("| VERGO</title>");
    expect(html).toContain('property="og:title" content="VERGO — Verify and Go"');
    expect(html).toMatch(/rel="icon"[^>]+href="\/icon\?/);
    expect(html).toMatch(/rel="apple-touch-icon"[^>]+href="\/apple-icon\?/);
    expect(html).not.toContain("/favicon.ico");
  }
  const original = readFileSync(join(__dirname, "../public/images/brand/vergo-logo.png"));
  const logo = await request.get("/images/brand/vergo-logo.png");
  expect(logo.ok()).toBe(true);
  expect(createHash("sha256").update(await logo.body()).digest("hex"))
    .toBe(createHash("sha256").update(original).digest("hex"));
  for (const [path, width, height] of [["/icon", 32, 32], ["/apple-icon", 180, 180], ["/opengraph-image", 1200, 630]] as const) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    const png = await response.body();
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(width);
    expect(png.readUInt32BE(20)).toBe(height);
  }
});

async function checkLogo(page: Page) {
  const logos = page.locator('img[src*="vergo-logo"]:visible');
  await expect(logos.first()).toBeVisible();
  await expect.poll(() => logos.evaluateAll(nodes => nodes.every(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
  for (const logo of await logos.all()) {
    const frame = await logo.locator("..").boundingBox();
    expect(frame).not.toBeNull();
    expect(frame!.width / frame!.height).toBeCloseTo(1878 / 512, 1);
    expect(frame!.x).toBeGreaterThanOrEqual(0);
    expect(frame!.x + frame!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  }
  expect(await page.locator('img[src*="sap-brand"]').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test("public and authentication pages display VERGO without changing their navigation", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const requests = await fixtureApi(page, { guest: true });
  for (const path of ["/", "/login", "/signup", "/incidents", "/activities", `/activities/${ids.activity}`]) {
    await page.goto(path);
    await checkLogo(page);
    await expect(page.getByRole("link", { name: /VERGO/ }).first()).toBeVisible();
    if (path === `/activities/${ids.activity}`) {
      await expect(page.getByText(activity.description, { exact: true })).toBeVisible();
      await expect(page.getByText(activity.coordinatorDisplayName!, { exact: true })).toBeVisible();
    }
    if (["/", "/login", "/activities"].includes(path)) await page.screenshot({ path: info.outputPath(`vergo-${path === "/" ? "home" : path.slice(1)}.png`) });
  }
  expect(errors).toEqual([]);
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("dashboard and settings keep the same account and assistant under the new brand", async ({ page }, info) => {
  const requests = await fixtureApi(page, { role: "admin" });
  for (const path of ["/dashboard", "/dashboard?view=activities", "/dashboard?view=settings", "/dashboard?view=moderation"]) {
    await page.goto(path);
    await checkLogo(page);
    await expect(page.getByRole("button", { name: /VERGO/ }).or(page.getByRole("link", { name: /VERGO/ })).first()).toBeVisible();
    if (path === "/dashboard") await page.screenshot({ path: info.outputPath("vergo-dashboard.png") });
  }
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

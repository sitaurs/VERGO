import { expect, test } from "@playwright/test";
import { fixtureApi } from "./r1-fixtures";

test("2.5D landing keeps complete readable content, artwork and real destinations across screen sizes", async ({ page }, info) => {
  test.setTimeout(120_000);
  const requests = await fixtureApi(page, { guest: true });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/map-config", route => route.fulfill({ status: 503, json: { available: false } }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of info.project.name === "mobile" ? [320, 390, 430] : [768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 761 ? 844 : 1000 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    for (const id of ["beranda", "cara-kerja", "fitur", "peta", "verifikasi", "aksi-warga", "edukasi"]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    }
    await page.locator("footer").scrollIntoViewIfNeeded();
    const featureTitles = page.locator("#fitur h3");
    expect(await featureTitles.evaluateAll(titles => titles.every(title => Number(getComputedStyle(title).fontWeight) >= 700))).toBe(true);
    const firstFeature = page.locator("#fitur a").first();
    const artwork = await firstFeature.locator("img").boundingBox();
    const copy = await firstFeature.locator("h3").boundingBox();
    expect(artwork!.x + artwork!.width).toBeLessThanOrEqual(copy!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect.poll(() => page.locator('img[src*="landing-25d"]').evaluateAll(images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
    await expect(page.locator("#aksi-warga").getByRole("link").filter({ has: page.getByRole("heading", { name: "Kegiatan warga", exact: true }) })).toHaveAttribute("href", "/activities");
    if ([390, 1440].includes(width)) {
      await page.locator("#fitur").screenshot({ path: info.outputPath(`features-25d-${width}.png`) });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await page.screenshot({ path: info.outputPath(`landing-25d-${width}.png`), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
  expect(requests.filter(request => !["GET", "HEAD"].includes(request.method))).toEqual([]);
});

test("public language control switches the complete new copy and remembers the choice", async ({ page }) => {
  await fixtureApi(page, { guest: true });
  await page.goto("/");
  await page.getByRole("button", { name: /Ubah bahasa, saat ini/ }).click();
  await page.getByRole("menuitemradio", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toContainText("The right action.");
  await expect(page.locator("#verifikasi h2")).toContainText("People verify.");
  await expect(page.locator("#aksi-warga h2")).toContainText("community action.");
  await page.reload();
  await expect(page.locator("h1")).toContainText("Clear evidence.");
  await page.getByRole("button", { name: /Change language, current/ }).click();
  await page.getByRole("menuitemradio", { name: "Bahasa Indonesia", exact: true }).click();
  await expect(page.locator("h1")).toContainText("Bukti yang jelas.");
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
});

test("native FAQ and existing privacy dialog remain keyboard-operable", async ({ page }) => {
  await fixtureApi(page, { guest: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const summary = page.locator("#edukasi summary").nth(1);
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(summary.locator("..")).toHaveAttribute("open", "");
  await expect(page.locator("#edukasi details").first()).not.toHaveAttribute("open", "");
  await page.getByRole("button", { name: "Kebijakan Privasi", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Kebijakan Privasi", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

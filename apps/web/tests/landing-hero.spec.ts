import { expect, test } from "@playwright/test";
import { fixtureApi } from "./r1-fixtures";

for (const width of [320, 390, 768, 1024, 1280, 1440, 1672, 1920]) {
  test(`hero stays readable and interactive at ${width}px in both languages`, async ({ page }, info) => {
    const requests = await fixtureApi(page);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: width < 761 ? 844 : 1000 });
    for (const locale of ["en", "id"]) {
      await page.context().addCookies([{ name: "sap_locale", value: locale, url: info.project.use.baseURL! }]);
      await page.goto("/");
      const hero = page.locator("#beranda");
      await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => hero.evaluate(element => [...element.querySelectorAll("img")]
        .filter(image => image.getBoundingClientRect().width > 0)
        .every(image => image.complete && image.naturalWidth > 0))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

      const overlap = await hero.evaluate(element => {
        const center = element.querySelector("h1")!.parentElement!.getBoundingClientRect();
        return [...element.querySelectorAll(":scope > div > a")].filter(card => {
          const box = card.getBoundingClientRect();
          return box.width > 0 && box.height > 0 && box.left < center.right && box.right > center.left && box.top < center.bottom && box.bottom > center.top;
        }).map(card => card.textContent);
      });
      expect(overlap, `Floating cards overlap the ${locale} hero at ${width}px`).toEqual([]);
      const scan = hero.getByRole("link", { name: locale === "en" ? "Start scanning" : "Mulai scan", exact: true });
      await expect(scan).toHaveAttribute("href", "/dashboard?view=scan");
      await scan.focus();
      await expect(scan).toBeFocused();
      await expect(hero.getByRole("link", { name: locale === "en" ? "Public incidents" : "Kejadian publik", exact: true })).toHaveAttribute("href", "/incidents");
      await expect(hero.getByRole("link", { name: /Area map|Peta area/ }).last()).toHaveAttribute("href", "#peta");
      await hero.getByRole("heading", { level: 1 }).click();
      await expect.poll(() => hero.evaluate(element => document.getAnimations().filter(animation =>
        animation.id === "sap-entry" && animation.effect instanceof KeyframeEffect &&
        animation.effect.target instanceof Element && element.contains(animation.effect.target)).length)).toBe(0);
      await page.screenshot({ path: info.outputPath(`hero-${width}-${locale}.png`), fullPage: false });
    }
    expect(errors).toEqual([]);
    expect(requests.filter(request => !["GET", "HEAD"].includes(request.method))).toEqual([]);
  });
}

test("hero respects reduced motion and preserves content without JavaScript", async ({ browser }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: "reduce", viewport: { width: 1672, height: 1000 } });
  const page = await context.newPage();
  await page.goto(info.project.use.baseURL!);
  const hero = page.locator("#beranda");
  await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
  const state = await hero.evaluate(element => ({
    visible: getComputedStyle(element.querySelector("h1")!).opacity,
    decorativeAnimations: [...element.querySelectorAll("span")].map(node => getComputedStyle(node).animationName).filter(name => name !== "none"),
  }));
  expect(state.visible).toBe("1");
  expect(state.decorativeAnimations).toEqual([]);
  await context.close();
});

import { expect, test, type Page } from "@playwright/test";
import { fixtureApi } from "./r1-fixtures";

async function animationState(page: Page) {
  return page.evaluate(() => document.getAnimations().filter(animation => animation.id.startsWith("vergo-")).map(animation => ({
    id: animation.id, state: animation.playState, time: animation.currentTime,
    target: (animation.effect as KeyframeEffect).target instanceof Element
      ? ((animation.effect as KeyframeEffect).target as Element).getAttribute("data-landing-float") : null,
  })));
}

test("ambient motion can pause and resume without replaying content or changing links", async ({ page }) => {
  const requests = await fixtureApi(page, { guest: true });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const root = page.locator("[data-landing-motion]");
  await expect(root).toHaveAttribute("data-landing-motion-state", "running");
  await expect.poll(async () => (await animationState(page)).some(animation => animation.id === "vergo-ambient" && animation.state === "running")).toBe(true);
  const title = await page.locator("h1").innerText();
  await page.getByRole("button", { name: "Jeda animasi", exact: true }).click();
  await expect(root).toHaveAttribute("data-landing-motion-state", "paused");
  await expect(page.getByRole("button", { name: "Lanjutkan animasi" })).toHaveAttribute("aria-pressed", "true");
  expect((await animationState(page)).every(animation => animation.state !== "running")).toBe(true);
  await page.getByRole("button", { name: "Lanjutkan animasi" }).click();
  await expect(root).toHaveAttribute("data-landing-motion-state", "running");
  await expect.poll(async () => (await animationState(page)).some(animation => animation.id === "vergo-ambient" && animation.state === "running")).toBe(true);
  expect(await page.locator("h1").innerText()).toBe(title);
  await expect(page.getByRole("link", { name: "Mulai scan", exact: true })).toHaveAttribute("href", "/dashboard?view=scan");
  await expect(page.getByRole("link", { name: "Kejadian publik", exact: true }).first()).toHaveAttribute("href", "/incidents");
  expect(errors).toEqual([]);
  expect(requests.filter(request => !["GET", "HEAD"].includes(request.method))).toEqual([]);
});

test("live reduced-motion changes settle decoration immediately and keep the user's pause choice", async ({ page }) => {
  await fixtureApi(page, { guest: true });
  await page.goto("/");
  const root = page.locator("[data-landing-motion]");
  await expect(root).toHaveAttribute("data-landing-motion-state", "running");
  await page.getByRole("button", { name: "Jeda animasi", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(root).toHaveAttribute("data-landing-motion-state", "reduced");
  await expect.poll(() => animationState(page)).toEqual([]);
  await expect(page.locator("[data-landing-motion-toggle]")).toBeHidden();
  await expect(page.locator("h1")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(root).toHaveAttribute("data-landing-motion-state", "paused");
  expect(await animationState(page)).toEqual([]);
  await page.getByRole("button", { name: "Lanjutkan animasi" }).click();
  await expect.poll(async () => (await animationState(page)).some(animation => animation.state === "running")).toBe(true);
});

test("scroll reveals each section once and stops offscreen hero motion", async ({ page }) => {
  await fixtureApi(page, { guest: true });
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    (window as unknown as { landingEntries: string[] }).landingEntries = [];
    Element.prototype.animate = function (...args: Parameters<Element["animate"]>) {
      if (this.hasAttribute("data-landing-enter")) (window as unknown as { landingEntries: string[] }).landingEntries.push(this.textContent ?? "");
      return Reflect.apply(original, this, args) as Animation;
    };
  });
  await page.goto("/");
  await expect(page.locator("[data-landing-motion]")).toHaveAttribute("data-landing-motion-state", "running");
  await page.locator("#peta").scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator("#beranda").evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);
  await page.locator("#verifikasi").scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (window as unknown as { landingEntries: string[] }).landingEntries.some(text => text.includes("AI membantu.")))).toBe(true);
  await page.locator("#beranda").scrollIntoViewIfNeeded();
  await page.locator("#verifikasi").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => (window as unknown as { landingEntries: string[] }).landingEntries.filter(text => text.includes("AI membantu.")).length)).toBe(1);
});

test("2.5D decoration settles under hover and controls never float", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Pointer hover is a desktop interaction.");
  await fixtureApi(page, { guest: true });
  await page.goto("/");
  const card = page.locator('[data-landing-float="shape"]').first();
  await expect(card).toBeVisible();
  const state = () => card.evaluate(element => element.getAnimations().filter(animation => animation.id === "vergo-ambient").map(animation => animation.playState));
  await expect.poll(state).toEqual(["running"]);
  await expect(page.locator('[data-landing-float] a, [data-landing-float] button')).toHaveCount(0);
  // A real pointer can enter a moving surface; locator.hover waits for all motion to finish.
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(state).toEqual(["paused"]);
  const action = page.locator('#beranda a[href="/dashboard?view=scan"]');
  await action.focus();
  await page.mouse.move(1, 1);
  await expect(action).toBeFocused();
  await page.locator("h1").click();
  await expect.poll(state).toEqual(["running"]);
});

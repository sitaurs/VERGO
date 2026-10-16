import { expect, test, type Page } from "@playwright/test";
import { fixtureApi, json } from "./r1-fixtures";

async function setup(page: Page) {
  await page.route("**/api/settings-capabilities", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ mfaAvailable: true }) }));
  return fixtureApi(page, { role: "admin", handler: async (route, path) => {
    if (path === "/auth/mfa") { await json(route, { status: "disabled" }); return true; }
    if (path === "/users/me/report-notification-preferences") { await json(route, { emailEnabled: false }); return true; }
    return false;
  } });
}
const trigger = (page: Page) => page.getByRole("button", { name: /^(Ubah bahasa, saat ini|Change language, current:)/ });
const menu = (page: Page) => page.getByRole("menu", { name: /^(Pilih bahasa|Choose language)$/ });
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.id === "sap-entry").length)).toBe(0);
}

test("header uses the approved translate SVG, current-locale badge and two radio options", async ({ page }, info) => {
  const requests = await setup(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dashboard");
  await expect(trigger(page)).toHaveCount(1);
  await expect(trigger(page)).toHaveText("ID");
  await expect(trigger(page).locator("svg")).toHaveCount(1);
  await trigger(page).click();
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
  await expect(menu(page).getByRole("menuitemradio")).toHaveCount(2);
  await expect(menu(page).getByRole("menuitemradio", { name: "Bahasa Indonesia", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(menu(page).getByRole("menuitemradio", { name: "English", exact: true })).toHaveAttribute("aria-checked", "false");
  await expect(menu(page).getByText("Bahasa aktif", { exact: true })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: info.outputPath(`language-menu-${info.project.name}.png`), fullPage: false });
  expect(await menu(page).evaluate(element => { const box = element.getBoundingClientRect(); return box.left >= 15 && box.right <= innerWidth - 15 && box.top >= 0 && box.bottom <= innerHeight; })).toBe(true);
  await trigger(page).click();
  await expect(menu(page)).toHaveCount(0);
  await trigger(page).click();
  await expect(menu(page)).toBeVisible();
  await page.getByRole("heading", { name: "Dashboard", exact: true }).click();
  await expect(menu(page)).toHaveCount(0);
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  expect(errors).toEqual([]);
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("changing locale is immediate, persists on reload and stays in sync with existing settings", async ({ page }) => {
  const requests = await setup(page);
  await page.goto("/dashboard?view=settings");
  const languageSettings = page.getByRole("group", { name: "Bahasa antarmuka" });
  await expect(languageSettings.getByRole("radio", { name: /Bahasa Indonesia/ })).toBeChecked();
  await trigger(page).click();
  await menu(page).getByRole("menuitemradio", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(trigger(page)).toHaveText("EN");
  await expect(trigger(page)).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Display language updated." })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sap.locale.v1"))).toBe("en");
  expect((await page.context().cookies()).find(cookie => cookie.name === "sap_locale")?.value).toBe("en");
  await expect(page).toHaveURL(/view=settings/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(trigger(page)).toHaveText("EN");
  await expect(page.getByRole("group", { name: "Interface language" }).getByRole("radio", { name: /English/ })).toBeChecked();
  await page.getByRole("group", { name: "Interface language" }).getByRole("radio", { name: /Bahasa Indonesia/ }).check();
  await expect(trigger(page)).toHaveText("ID");
  await trigger(page).click();
  await expect(menu(page).getByRole("menuitemradio", { name: "Bahasa Indonesia", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("keyboard navigation selects only on confirmation and closes with Escape and Tab", async ({ page }, info) => {
  const requests = await setup(page);
  await page.goto("/dashboard");
  await trigger(page).focus(); await page.keyboard.press("ArrowDown");
  await expect(menu(page).getByRole("menuitemradio", { name: "Bahasa Indonesia", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu(page).getByRole("menuitemradio", { name: "English", exact: true })).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await page.keyboard.press("Home");
  await expect(menu(page).getByRole("menuitemradio", { name: "Bahasa Indonesia", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(menu(page).getByRole("menuitemradio", { name: "English", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu(page)).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(menu(page).getByRole("menuitemradio", { name: "English", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger(page)).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.keyboard.press("Space");
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(menu(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: info.project.name === "mobile" ? /^Account of Warga/ : /^Open account menu for/ })).toBeFocused();
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("switching language preserves an unsaved profile draft and the current view", async ({ page }) => {
  const requests = await setup(page);
  await page.goto("/dashboard?view=settings");
  await page.getByRole("textbox", { name: "Nama lengkap", exact: true }).fill("Nama draf yang belum disimpan");
  await trigger(page).click();
  await menu(page).getByRole("menuitemradio", { name: "English", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Full name", exact: true })).toHaveValue("Nama draf yang belum disimpan");
  await expect(page).toHaveURL(/view=settings/);
  await trigger(page).click();
  await menu(page).getByRole("menuitemradio", { name: "Bahasa Indonesia", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Nama lengkap", exact: true })).toHaveValue("Nama draf yang belum disimpan");
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("blocked browser storage keeps the session usable and explains temporary locale changes", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error("Synthetic storage restriction"); };
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    Object.defineProperty(document, "cookie", { configurable: true, get() { return descriptor.get!.call(document); }, set() { throw new Error("Synthetic cookie restriction"); } });
  });
  const requests = await setup(page);
  await page.goto("/dashboard");
  await trigger(page).click();
  await menu(page).getByRole("menuitemradio", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("status")).toContainText("Language changed for this session.");
  await expect(trigger(page)).toHaveText("EN");
  await expect(trigger(page)).toBeFocused();
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("admin header works with reduced motion and leaves source data and API writes untouched", async ({ page }) => {
  const requests = await setup(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard?view=admin-moderation");
  await trigger(page).click();
  await expect(menu(page)).toBeVisible();
  expect(await menu(page).evaluate(element => getComputedStyle(element).animationName)).toContain("fade");
  await menu(page).getByRole("menuitemradio", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveURL(/view=admin-moderation/);
  await trigger(page).click();
  await menu(page).getByRole("menuitemradio", { name: "Bahasa Indonesia", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Moderasi laporan", exact: true })).toBeVisible();
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("the language menu fits phones and desktop and dismisses when the viewport changes", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "The viewport matrix runs once; other cases cover both devices.");
  await setup(page);
  await page.goto("/dashboard");
  for (const width of [320, 390, 600, 760, 761, 1024, 1280, 1672]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(trigger(page)).toHaveCount(1);
    await trigger(page).click();
    await expect(menu(page)).toBeVisible();
    expect(await menu(page).evaluate(element => { const box = element.getBoundingClientRect(); return box.left >= 15 && box.right <= innerWidth - 15 && box.bottom <= innerHeight; }), `menu at ${width}px`).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `page at ${width}px`).toBe(true);
    await page.setViewportSize({ width: width + 1, height: 844 });
    await expect(menu(page)).toHaveCount(0);
  }
});

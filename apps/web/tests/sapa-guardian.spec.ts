import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { SAPA_ARTWORK, SAPA_ASSET_ROOT, SAPA_MOTIONS } from "../components/sapa-motion-data";
import { failure, fixtureApi, ids, json, user } from "./r1-fixtures";

type Draw = { file: string; frame: number; x: number; y: number; width: number; height: number };
async function recordFrames(page: Page) {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    const state = window as unknown as { sapaFrames: Draw[] };
    state.sapaFrames = [];
    CanvasRenderingContext2D.prototype.drawImage = function (...args: [CanvasImageSource, ...number[]]) {
      const image = args[0];
      if (image instanceof HTMLImageElement && image.src.includes("/images/sapa/")) {
        const [, sx, sy, sw, sh, x, y, width, height] = args as unknown as [HTMLImageElement, ...number[]];
        state.sapaFrames.push({ file: image.src.split("/").pop()!, frame: Math.round(sy / sh) * 4 + Math.round(sx / sw), x, y, width, height });
        if (state.sapaFrames.length > 1800) state.sapaFrames.splice(0, 900);
      }
      return Reflect.apply(original, this, args);
    };
  });
}
const frames = (page: Page) => page.evaluate(() => (window as unknown as { sapaFrames: Draw[] }).sapaFrames);
async function setup(page: Page, options: { disabled?: boolean; handler?: NonNullable<Parameters<typeof fixtureApi>[1]>["handler"] } = {}) {
  await page.context().addCookies([{ name: "sap_locale", value: "id", url: test.info().project.use.baseURL! }]);
  return fixtureApi(page, { handler: async (route, path) => {
    if (path === "/auth/me") { await json(route, { ...user, sapaEnabled: !options.disabled }); return true; }
    return await options.handler?.(route, path) ?? false;
  } });
}
async function loaded(page: Page) {
  const launcher = page.getByRole("button", { name: "Buka chat SAPA", exact: true });
  await expect(launcher).toBeVisible();
  await expect.poll(() => launcher.locator("canvas").evaluate(node => getComputedStyle(node).opacity)).toBe("1");
  return launcher;
}

test("v2 PNGs match the supplied manifest and all 48 registered poses fit the existing canvas", async () => {
  const root = join(__dirname, "../public", SAPA_ASSET_ROOT);
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  expect(manifest.version).toBe(2);
  expect(manifest.assets).toHaveLength(8);
  for (const asset of manifest.assets) {
    expect(createHash("sha256").update(readFileSync(join(root, asset.file))).digest("hex")).toBe(asset.sha256);
    if (!(asset.id in SAPA_MOTIONS)) continue;
    const spec = SAPA_MOTIONS[asset.id as keyof typeof SAPA_MOTIONS];
    expect(spec.durations).toEqual(asset.frames.map((frame: { duration_ms: number }) => frame.duration_ms));
    expect(spec.anchors).toEqual(asset.frames.map((frame: { foot_anchor: number[] }) => frame.foot_anchor));
    for (const frame of asset.frames) {
      const scale = 100 / spec.characterHeight;
      const [ax, ay] = frame.foot_anchor;
      const ground = spec.anchors[frame.index < 4 ? 0 : 7][1];
      const rise = asset.id === "success" && frame.index >= 2 && frame.index <= 4 ? Math.min(0, ay - ground) * scale : 0;
      const [left, top, right, bottom] = frame.solid_bbox;
      expect(64 + (left - ax) * scale).toBeGreaterThan(2);
      expect(64 + (right - ax) * scale).toBeLessThan(126);
      expect(119 + (top - ay) * scale + rise - .7).toBeGreaterThan(2);
      expect(119 + (bottom - ay) * scale + rise).toBeLessThan(126);
    }
  }
});

test("guardian replaces launcher, avatar, greeting and settings without changing preference", async ({ page }, info) => {
  await recordFrames(page);
  const requests = await setup(page);
  const old: string[] = [];
  page.on("request", request => { if (/animation-v1|SAPA_Chat_Avatar|SAPA_Welcome_Sticker|settings%2Fsapa-welcome|settings\/sapa-welcome/.test(request.url())) old.push(request.url()); });
  await page.goto("/dashboard");
  const launcher = await loaded(page);
  const before = await launcher.boundingBox();
  await expect.poll(async () => (await frames(page)).some(frame => frame.file === SAPA_MOTIONS.idle.file)).toBe(true);
  await page.screenshot({ path: info.outputPath("guardian-launcher.png") });
  const opener = info.project.name === "mobile" ? page.getByRole("button", { name: "Buka chat SAPA dari navbar", exact: true }) : launcher;
  await opener.click();
  const panel = page.getByRole("dialog", { name: "SAPA", exact: true });
  await expect(panel.getByRole("textbox", { name: "Pesan untuk SAPA" })).toBeFocused();
  await expect(panel.locator("header img")).toHaveAttribute("src", new RegExp(encodeURIComponent(SAPA_ARTWORK.avatar)));
  await expect(panel.getByRole("img", { name: "SAPA", exact: true })).toHaveAttribute("src", new RegExp(encodeURIComponent(SAPA_ARTWORK.master)));
  await expect.poll(async () => (await frames(page)).some(frame => frame.file === SAPA_MOTIONS.wave.file)).toBe(true);
  await expect.poll(() => panel.evaluate(node => getComputedStyle(node).opacity)).toBe("1");
  await expect.poll(() => panel.locator("img").evaluateAll(nodes => nodes.every(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: info.outputPath("guardian-chat.png") });
  await panel.getByRole("button", { name: "Minimalkan chat SAPA" }).click();
  await expect(opener).toBeFocused();
  const after = await launcher.boundingBox();
  expect(after?.width).toBe(before?.width);
  expect(after?.height).toBe(before?.height);
  await page.goto("/dashboard?view=settings");
  await expect(page.getByRole("switch", { name: "Tampilkan Pet SAPA" })).toHaveAttribute("aria-checked", "true");
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Pet SAPA", exact: true }) });
  await expect(section.locator("img")).toHaveCount(2);
  for (const image of await section.locator("img").all()) await expect(image).toHaveAttribute("src", /animation-v2-guardian/);
  expect(old).toEqual([]);
  expect(requests.filter(request => request.method !== "GET")).toEqual([]);
});

test("all idle poses retain their baseline and dragging pauses the sprite without opening chat", async ({ page }) => {
  await recordFrames(page);
  const requests = await setup(page);
  await page.clock.install();
  await page.goto("/dashboard");
  const launcher = await loaded(page);
  await page.clock.runFor(7600);
  const idle = (await frames(page)).filter(frame => frame.file === SAPA_MOTIONS.idle.file);
  expect([...new Set(idle.map(frame => frame.frame))].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  for (const frame of idle) {
    const spec = SAPA_MOTIONS.idle;
    const scale = 100 / spec.characterHeight;
    expect(frame.width).toBeCloseTo(443.5 * scale, 4);
    expect(frame.y + spec.anchors[frame.frame][1] * scale).toBeGreaterThanOrEqual(118.29);
    expect(frame.y + spec.anchors[frame.frame][1] * scale).toBeLessThanOrEqual(119.01);
  }
  const before = (await launcher.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 - 60, before.y + before.height / 2 - 60, { steps: 8 });
  await page.clock.runFor(100);
  const held = await frames(page);
  await page.clock.runFor(200);
  expect(await frames(page)).toEqual(held);
  await page.mouse.up();
  await page.clock.runFor(140);
  await expect(page.getByRole("dialog", { name: "SAPA", exact: true })).toHaveCount(0);
  const after = (await launcher.boundingBox())!;
  expect(after.x).toBeLessThan(before.x - 30);
  expect(after.y).toBeLessThan(before.y - 30);
  expect(after.width).toBe(before.width);
  expect(after.height).toBe(before.height);
  expect(requests.some(request => request.method !== "GET")).toBe(false);
});

test("pending, confirmed success and error use their guardian sheets while keeping chat contract", async ({ page }, info) => {
  await recordFrames(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let count = 0;
  const requests = await setup(page, { handler: async (route, path) => {
    if (path !== "/assistant/chat") return false;
    count += 1;
    if (count === 1) {
      await pending;
      await json(route, { conversationId: ids.operation, reply: "Jawaban guardian untuk tes.", suggestedActions: [{ label: "Lihat peta", target: "areas" }], citations: [] });
    } else await failure(route, 503, "ASSISTANT_UNAVAILABLE");
    return true;
  } });
  await page.goto("/dashboard");
  const launcher = await loaded(page);
  await (info.project.name === "mobile" ? page.getByRole("button", { name: "Buka chat SAPA dari navbar", exact: true }) : launcher).click();
  const input = page.getByRole("textbox", { name: "Pesan untuk SAPA" });
  await input.fill("Bagaimana cara memilah plastik?");
  await page.getByRole("button", { name: "Kirim pesan ke SAPA", exact: true }).click();
  await expect.poll(async () => (await frames(page)).some(frame => frame.file === SAPA_MOTIONS.thinking.file)).toBe(true);
  await expect(page.getByRole("button", { name: "Kirim pesan ke SAPA", exact: true })).toBeDisabled();
  release();
  await expect(page.getByText("Jawaban guardian untuk tes.", { exact: true })).toBeVisible();
  await expect.poll(async () => (await frames(page)).some(frame => frame.file === SAPA_MOTIONS.success.file)).toBe(true);
  await input.fill("Pertanyaan untuk tes gagal.");
  await page.getByRole("button", { name: "Kirim pesan ke SAPA", exact: true }).click();
  await expect.poll(async () => (await frames(page)).some(frame => frame.file === SAPA_MOTIONS.error.file)).toBe(true);
  await expect(input).toHaveValue("Pertanyaan untuk tes gagal.");
  await expect(page.getByRole("alert").filter({ hasText: "Chat SAPA sementara tidak tersedia" })).toBeVisible();
  const chat = requests.filter(request => request.path === "/assistant/chat");
  expect(chat).toHaveLength(2);
  expect(chat[0].body).toMatchObject({ message: "Bagaimana cara memilah plastik?", pageContext: "dashboard", conversationId: null });
  expect(chat[1].body).toMatchObject({ conversationId: ids.operation });
});

test("reduced motion keeps the guardian static and chat usable, including a live change", async ({ page }, info) => {
  await recordFrames(page);
  await setup(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard");
  const launcher = await loaded(page);
  await page.waitForTimeout(180);
  const before = await frames(page);
  await page.waitForTimeout(180);
  expect(await frames(page)).toEqual(before);
  expect(before.every(frame => frame.frame === 0)).toBe(true);
  await page.screenshot({ path: info.outputPath("guardian-reduced.png") });
  await (info.project.name === "mobile" ? page.getByRole("button", { name: "Buka chat SAPA dari navbar", exact: true }) : launcher).click();
  await expect(page.getByRole("textbox", { name: "Pesan untuk SAPA" })).toBeFocused();
  await page.getByRole("button", { name: "Minimalkan chat SAPA" }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(async () => (await frames(page)).length).toBeGreaterThan(before.length);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(120);
  const settled = await frames(page);
  await page.waitForTimeout(180);
  expect(await frames(page)).toEqual(settled);
});

test("unavailable sprites retain the guardian fallback and disabled pets stay disabled", async ({ page }, info) => {
  await page.route("**/images/sapa/animation-v2-guardian/*-sheet.png", route => route.abort());
  await setup(page);
  await page.goto("/dashboard");
  const launcher = page.getByRole("button", { name: "Buka chat SAPA", exact: true });
  await expect(launcher.locator("img")).toBeVisible();
  await expect(launcher.locator("img")).toHaveAttribute("src", /animation-v2-guardian/);
  await (info.project.name === "mobile" ? page.getByRole("button", { name: "Buka chat SAPA dari navbar", exact: true }) : launcher).click();
  await expect(page.getByRole("textbox", { name: "Pesan untuk SAPA" })).toBeFocused();
  await page.getByRole("button", { name: "Minimalkan chat SAPA" }).click();
  await page.unroute("**/api/v1/**");
  await setup(page, { disabled: true });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Buka chat SAPA", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Buka chat SAPA dari navbar", exact: true })).toHaveCount(0);
});

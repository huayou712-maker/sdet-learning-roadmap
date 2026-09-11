import { test, expect, type Page } from "@playwright/test";
import { contentScreenshotOptions } from "./helpers/images";

const key = "sdet-ui-roadmap-motion";
const root = "[data-roadmap-motion]";
test.use({
  reducedMotion: "no-preference",
  viewport: { width: 1440, height: 1000 },
  video: { mode: "on", size: { width: 1440, height: 1000 } },
});
async function ready(page: Page) {
  await page.goto("/roadmap");
  await expect(
    page.getByRole("navigation", { name: "实践任务导航" }),
  ).toBeVisible();
  await expect(page.locator(root)).not.toHaveAttribute(
    "data-roadmap-motion",
    "pending",
  );
}

test("R9 path really draws once and clicks remain available without learning writes", async ({
  page,
}) => {
  await page.addInitScript((key) => localStorage.setItem(key, "off"), key);
  const before = await (await page.request.get("/api/progress")).json();
  const mutations: string[] = [];
  page.on("request", (r) => {
    if (
      new URL(r.url()).pathname.startsWith("/api/") &&
      !["GET", "HEAD"].includes(r.method())
    )
      mutations.push(r.url());
  });
  await ready(page);
  await page.getByRole("button", { name: "开启路线动效", exact: true }).click();
  await expect(page.locator(root)).toHaveAttribute(
    "data-atlas-animate",
    "true",
  );
  const trail = page.locator("[data-atlas-trail]");
  const first = await trail.evaluate(
    (el) => getComputedStyle(el).strokeDashoffset,
  );
  await expect
    .poll(() => trail.evaluate((el) => getComputedStyle(el).strokeDashoffset))
    .not.toBe(first);
  await expect(page.locator("[data-atlas-artwork]")).toHaveCSS(
    "pointer-events",
    "none",
  );
  await expect(page.locator("[data-atlas-artwork]")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await page.locator('[data-atlas-task="ci"]').click();
  await expect(page.locator("#task-ci summary")).toBeFocused();
  await expect(page.locator("#task-ci details")).toHaveAttribute("open", "");
  await expect(page.locator('[data-atlas-task="ci"]')).toHaveAttribute(
    "data-viewing",
    "true",
  );
  await expect(page.locator('[data-atlas-task="start"]')).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(page.locator('[data-atlas-task="ci"]')).not.toHaveAttribute(
    "aria-current",
  );
  await expect(page.locator(root)).toHaveAttribute(
    "data-atlas-scene",
    "resting",
  );
  // The real pointer click finishes while the finite reveal is still in flight.
  // Leaving the atlas pauses that reveal; navigation never waits for it.
  await expect(page.locator(root)).toHaveAttribute(
    "data-atlas-animate",
    "true",
  );
  await page.getByRole("link", { name: "返回山河图 ↑", exact: true }).click();
  await expect(page.locator(root)).toHaveAttribute(
    "data-atlas-scene",
    "active",
  );
  await expect(page.locator(root)).not.toHaveAttribute("data-atlas-animate");
  await expect(trail).toHaveCSS("animation-name", "none");
  await page.locator('[data-atlas-task="data"]').click();
  await page.getByRole("link", { name: "返回山河图 ↑", exact: true }).click();
  await expect(page.locator(root)).not.toHaveAttribute("data-atlas-animate");
  expect(await (await page.request.get("/api/progress")).json()).toEqual(
    before,
  );
  expect(mutations).toEqual([]);
});

test("R9 keyboard switch persists only a UI preference and does not leak to notes", async ({
  page,
}) => {
  await ready(page);
  const toggle = page.getByRole("button", {
    name: "关闭路线动效",
    exact: true,
  });
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await toggle.press("Enter");
  await expect(page.locator(root)).toHaveAttribute(
    "data-roadmap-motion",
    "paused",
  );
  await expect(page.locator("[data-atlas-trail]")).toHaveCSS(
    "animation-name",
    "none",
  );
  expect(await page.evaluate(() => Object.entries(localStorage))).toEqual([
    [key, "off"],
  ]);
  await page.reload();
  await expect(page.locator(root)).toHaveAttribute(
    "data-roadmap-motion",
    "paused",
  );
  await page.locator('[data-atlas-task="api"]').click();
  await expect(page.locator("#task-api details > div")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.goto("/notes");
  await expect(
    page.getByRole("heading", { name: "学习笔记", exact: true }),
  ).toBeVisible();
  await expect(page.locator(root)).toHaveCount(0);
  await expect(page.locator("[data-roadmap-atlas]")).toHaveCount(0);
});

test("R9 system reduced motion wins immediately over a saved on preference", async ({
  page,
}) => {
  await ready(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(root)).toHaveAttribute(
    "data-roadmap-motion",
    "reduced",
  );
  await expect(
    page.getByRole("button", { name: "路线图已跟随系统减少动态效果" }),
  ).toBeDisabled();
  await expect(page.locator("[data-atlas-trail]")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.evaluate((key) => {
    localStorage.setItem(key, "on");
    dispatchEvent(new StorageEvent("storage", { key }));
  }, key);
  await expect(page.locator(root)).toHaveAttribute(
    "data-roadmap-motion",
    "reduced",
  );
  await page.locator('[data-atlas-task="data"]').click();
  await expect(page.locator("#task-data details > div")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator("#task-data summary")).toBeFocused();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(root)).toHaveAttribute(
    "data-roadmap-motion",
    "running",
  );
});

test("R9 unavailable observation keeps a static navigable atlas", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: undefined,
    }),
  );
  await ready(page);
  await expect(page.locator(root)).toHaveAttribute(
    "data-roadmap-motion",
    "static",
  );
  await expect(
    page.getByRole("button", { name: "当前浏览器使用静态路线图" }),
  ).toBeDisabled();
  await expect(page.locator("[data-atlas-task]")).toHaveCount(6);
  await page.locator('[data-atlas-task="ci"]').click();
  await expect(page.locator("#task-ci summary")).toBeFocused();
  await expect(page.locator("#task-ci details")).toHaveAttribute("open", "");
  await expect(page.locator("[data-atlas-trail]")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("R9 storage exceptions still allow pausing and reopening native chapters", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("synthetic denied storage");
    };
    Storage.prototype.setItem = () => {
      throw new Error("synthetic full storage");
    };
  });
  await ready(page);
  await page.getByRole("button", { name: "关闭路线动效", exact: true }).click();
  await expect(page.locator(root)).toHaveAttribute(
    "data-roadmap-motion",
    "paused",
  );
  await page.locator('[data-atlas-task="ui"]').click();
  await expect(page.locator("#task-ui details")).toHaveAttribute("open", "");
  await page.locator("#task-ui summary").press("Enter");
  await expect(page.locator("#task-ui details")).not.toHaveAttribute("open");
  await page.locator('[data-atlas-task="ui"]').click();
  await expect(page.locator("#task-ui details")).toHaveAttribute("open", "");
});

test("R9 atlas fits mobile, tablet and desktop with distinct touch targets and readable labels", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 720, 900, 1024, 1440, 1920]) {
    await test.step(String(width) + "px", async () => {
      await page.setViewportSize({ width, height: 1000 });
      await ready(page);
      const atlas = page.locator("[data-roadmap-atlas]");
      await expect
        .poll(() => page.evaluate(() => document.fonts.status))
        .toBe("loaded");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const bounds = await atlas.boundingBox();
      expect(bounds).not.toBeNull();
      const boxes = await page
        .locator("[data-atlas-task]")
        .evaluateAll((links) =>
          links.map((link) => {
            const b = link.getBoundingClientRect();
            return { x: b.x, y: b.y, width: b.width, height: b.height };
          }),
        );
      expect(boxes).toHaveLength(6);
      for (const b of boxes) {
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
        expect(b.x).toBeGreaterThanOrEqual(bounds!.x);
        expect(b.x + b.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
      }
      if (width <= 900) {
        for (let i = 1; i < boxes.length; i++)
          expect(boxes[i].y).toBeGreaterThanOrEqual(
            boxes[i - 1].y + boxes[i - 1].height,
          );
        expect(
          await page
            .locator('[data-atlas-task="start"] small')
            .first()
            .evaluate((label) => getComputedStyle(label).display),
        ).toBe("block");
      }
      // Capture in document coordinates: an element screenshot can auto-scroll
      // this tall mobile atlas and clip its final explanatory line.
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      const clip = await atlas.boundingBox();
      expect(clip).not.toBeNull();
      await page.screenshot({
        ...contentScreenshotOptions,
        path: testInfo.outputPath("atlas-" + width + ".png"),
        fullPage: true,
        clip: clip!,
        animations: "disabled",
      });
      const link = page.locator('[data-atlas-task="data"]');
      await link.scrollIntoViewIfNeeded();
      await link.focus();
      await expect(link).toBeFocused();
      await link.press("Enter");
      await expect(page.locator("#task-data summary")).toBeFocused();
      await expect(page.locator("#task-data details")).toHaveAttribute(
        "open",
        "",
      );
    });
  }
});

test("R9 viewing state follows hash history while recommendation and open chapters remain stable", async ({
  page,
}) => {
  await page.goto("/roadmap#task-ci");
  await expect(page.locator("#task-ci summary")).toBeFocused();
  await expect(page.locator('[data-atlas-task="ci"]')).toHaveAttribute(
    "data-viewing",
    "true",
  );
  await page.locator('[data-atlas-task="data"]').click();
  await expect(page).toHaveURL(/#task-data$/);
  await page.getByRole("button", { name: "关闭路线动效", exact: true }).click();
  await expect(page.locator("#task-data details")).toHaveAttribute("open", "");
  await page.goBack();
  await expect(page.locator("#task-ci summary")).toBeFocused();
  await expect(page.locator('[data-atlas-task="ci"]')).toHaveAttribute(
    "data-viewing",
    "true",
  );
  await expect(page.locator('[data-atlas-task="data"]')).not.toHaveAttribute(
    "data-viewing",
  );
  await page.goForward();
  await expect(page.locator("#task-data summary")).toBeFocused();
  await expect(page.locator('[data-atlas-task="start"]')).toHaveAttribute(
    "aria-current",
    "step",
  );
  await page.goto("/roadmap#unknown-task");
  await expect(page.locator("[data-atlas-task][data-viewing]")).toHaveCount(0);
  await expect(page.locator("[data-atlas-task]")).toHaveCount(6);
});

import { test, expect, type Page } from "@playwright/test";
import { contentScreenshotOptions, expectImageLoaded } from "./helpers/images";

const rootSelector = "[data-home-motion]";
const preferenceKey = "sdet-ui-home-motion";
test.use({
  reducedMotion: "no-preference",
  viewport: { width: 1440, height: 900 },
});

async function ready(page: Page) {
  await page.goto("/");
  await expectImageLoaded(page.locator(".hero-image"));
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-motion",
    "running",
  );
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-scene",
    "active",
  );
}
async function restart(page: Page) {
  await page.getByRole("button", { name: "关闭动态效果", exact: true }).click();
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await page.getByRole("button", { name: "开启动效", exact: true }).click();
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-scene",
    "active",
  );
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("R8 landscape and sword really animate while learning data remains untouched", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/") &&
      !["GET", "HEAD"].includes(request.method())
    )
      writes.push(request.url());
  });
  const before = await (await page.request.get("/api/progress")).json();
  await ready(page);
  await restart(page);
  const sword = page.locator("[data-atmosphere] svg > path").last();
  await expect
    .poll(() => sword.evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeGreaterThan(0.1);
  const initial = await page
    .locator(".hero-image")
    .evaluate((el) => getComputedStyle(el).transform);
  await expect
    .poll(() =>
      page
        .locator(".hero-image")
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .not.toBe(initial);
  await expect(page.locator("[data-atmosphere]")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator("[data-atmosphere]")).toHaveCSS(
    "pointer-events",
    "none",
  );
  const hero = page.locator("[data-cinematic-hero]");
  const box = (await hero.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.6);
  await expect
    .poll(() =>
      hero.evaluate((el) => parseFloat(el.style.getPropertyValue("--scene-x"))),
    )
    .toBeGreaterThan(0);
  expect(
    await hero.evaluate((el) =>
      Math.abs(parseFloat(el.style.getPropertyValue("--scene-x"))),
    ),
  ).toBeLessThanOrEqual(18);
  await page.mouse.move(0, 0);
  await expect
    .poll(() => hero.evaluate((el) => el.style.getPropertyValue("--scene-x")))
    .toBe("");
  await expect(
    page.getByRole("link", { name: "查看学习路线", exact: true }),
  ).toHaveAttribute("href", "/roadmap#task-start");
  expect(await (await page.request.get("/api/progress")).json()).toEqual(
    before,
  );
  expect(writes).toEqual([]);
});

test("R8 keyboard pause persists only a UI preference and survives reload", async ({
  page,
}) => {
  await ready(page);
  const button = page.getByRole("button", {
    name: "关闭动态效果",
    exact: true,
  });
  await button.focus();
  await button.press("Enter");
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await expect(page.locator(".hero-image")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".hero-image")).toHaveCSS("transform", "none");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), preferenceKey),
  ).toBe("off");
  await page.reload();
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await expect(
    page.getByRole("button", { name: "开启动效", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "查看学习路线", exact: true }).click();
  await expect(page).toHaveURL(/\/roadmap#task-start$/);
  await expect(page.locator(rootSelector)).toHaveCount(0);
});

test("R8 system reduced motion stops active effects immediately and cannot be overridden", async ({
  page,
}) => {
  await ready(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  await expect(
    page.getByRole("button", { name: "已跟随系统减少动态效果" }),
  ).toBeDisabled();
  for (const selector of [".hero-image", ".hero-poem > span:first-child"]) {
    await expect(page.locator(selector)).toHaveCSS("animation-name", "none");
    await expect(page.locator(selector)).toHaveCSS("transform", "none");
  }
  await expect(page.locator(".hero-poem > span:first-child")).toHaveCSS(
    "clip-path",
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-motion",
    "running",
  );
  await page.getByRole("button", { name: "关闭动态效果", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-motion",
    "paused",
  );
});

test("R8 blocked storage keeps the motion switch usable", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("synthetic storage read denial");
    };
    Storage.prototype.setItem = () => {
      throw new Error("synthetic storage write denial");
    };
  });
  await ready(page);
  await page.getByRole("button", { name: "关闭动态效果", exact: true }).click();
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await page.getByRole("button", { name: "开启动效", exact: true }).click();
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-motion",
    "running",
  );
  await expect(
    page.getByRole("link", { name: "查看作品集 →", exact: true }),
  ).toBeVisible();
});

test("R8 missing observer keeps content and navigation visible without an animation gate", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "IntersectionObserver", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("/");
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-motion",
    "static",
  );
  await expect(
    page.getByRole("button", { name: "当前浏览器使用静态效果" }),
  ).toBeDisabled();
  await expect(page.locator(".hero-image")).toHaveCSS("animation-name", "none");
  await expectImageLoaded(page.locator(".hero-image"));
  await expect(page.locator(".hero-poem > span:first-child")).toHaveCSS(
    "clip-path",
    "none",
  );
  await expect(
    page.getByRole("link", { name: "查看学习路线", exact: true }),
  ).toBeVisible();
  for (const section of await page.locator("[data-motion-reveal]").all()) {
    await expect(section).toHaveCSS("opacity", "1");
    await expect(section).toBeVisible();
  }
});

test("R8 scrolling unfolds content once and pauses the offscreen landscape", async ({
  page,
}) => {
  await ready(page);
  const projects = page.locator(".featured-projects");
  await expect(projects).not.toHaveAttribute("data-entered", "true");
  await projects.scrollIntoViewIfNeeded();
  await expect(projects).toHaveAttribute("data-entered", "true");
  await expect(projects).toHaveCSS("animation-iteration-count", "1");
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-scene",
    "resting",
  );
  await expect(page.locator(".hero-image")).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  const image = projects.locator("img").first();
  await image.scrollIntoViewIfNeeded();
  await expectImageLoaded(image);
  const link = projects.locator(".project-tile").first();
  await link.focus();
  await expect(projects).toHaveCSS("animation-name", "none");
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    scrollTo(0, 0);
  });
  await expect(page.locator(rootSelector)).toHaveAttribute(
    "data-scene",
    "active",
  );
  await expect(projects).toHaveAttribute("data-entered", "true");
  await noOverflow(page);
});

test("R8 mobile keeps text below artwork, reduces particles and preserves touch targets", async ({
  page,
}, testInfo) => {
  for (const width of [320, 390, 720]) {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    await expect(page.locator(".hero-image")).toHaveCSS(
      "animation-name",
      "none",
    );
    const visual = (await page.locator(".hero-visual").boundingBox())!;
    const copy = (await page.locator(".hero-copy").boundingBox())!;
    expect(copy.y).toBeGreaterThanOrEqual(visual.y + visual.height);
    const particles = page.locator("[data-atmosphere] span:visible");
    await expect(particles).toHaveCount(4);
    const button = page.getByRole("button", {
      name: "关闭动态效果",
      exact: true,
    });
    await expect(button).toBeInViewport();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(
      page.getByRole("link", { name: "查看学习路线", exact: true }),
    ).toBeInViewport();
    await noOverflow(page);
    await expect
      .poll(() =>
        page
          .locator(".hero-poem > span")
          .last()
          .evaluate((el) => Number(getComputedStyle(el).opacity)),
      )
      .toBe(1);
    await page.screenshot({
      ...contentScreenshotOptions,
      path: testInfo.outputPath("motion-mobile-" + width + ".png"),
    });
  }
});

test("R8 visual rehearsal records the actual opening and content transitions", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
    recordVideo: {
      dir: testInfo.outputPath("film"),
      size: { width: 1440, height: 900 },
    },
  });
  const page = await context.newPage();
  const video = page.video()!;
  try {
    await ready(page);
    await expect
      .poll(() => page.evaluate(() => document.fonts.status))
      .toBe("loaded");
    await restart(page);
    await expect
      .poll(() =>
        page
          .locator(".hero-poem > span")
          .last()
          .evaluate((el) => Number(getComputedStyle(el).opacity)),
      )
      .toBe(1);
    const sword = page.locator("[data-atmosphere] svg > path").last();
    await expect
      .poll(() => sword.evaluate((el) => Number(getComputedStyle(el).opacity)))
      .toBeGreaterThan(0.1);
    await page.screenshot({
      ...contentScreenshotOptions,
      path: testInfo.outputPath("cinematic-opening.png"),
    });
    await expect
      .poll(() =>
        page
          .locator(".hero-poem > span")
          .last()
          .evaluate((el) => Number(getComputedStyle(el).opacity)),
      )
      .toBe(1);
    await page.mouse.move(1200, 360);
    await expect
      .poll(() =>
        page
          .locator("[data-cinematic-hero]")
          .evaluate((el) => parseFloat(el.style.getPropertyValue("--scene-x"))),
      )
      .toBeGreaterThan(0);
    await page.mouse.wheel(0, 600);
    await expect(page.locator(rootSelector)).toHaveAttribute(
      "data-scene",
      "resting",
    );
    await page.locator(".featured-projects").scrollIntoViewIfNeeded();
    for (const image of await page.locator(".featured-projects img").all())
      await expectImageLoaded(image);
    await page.locator(".featured-projects .project-tile").first().hover();
    await page.screenshot({
      ...contentScreenshotOptions,
      path: testInfo.outputPath("cinematic-archive.png"),
    });
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator(rootSelector)).toHaveAttribute(
      "data-scene",
      "active",
    );
    await page
      .getByRole("button", { name: "关闭动态效果", exact: true })
      .click();
    await page.screenshot({
      ...contentScreenshotOptions,
      path: testInfo.outputPath("cinematic-static.png"),
    });
  } finally {
    await context.close();
    await video.saveAs(testInfo.outputPath("wind-at-the-pass.webm"));
  }
});

import { test, expect, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import { join } from "node:path";
import definitions from "../data/projects.json";
import { expectImageLoaded } from "./helpers/images";

const origin = "http://127.0.0.1:3100";
const widths = [1440, 1024, 390];

async function expectSharpImage(page: Page, image: Locator) {
  await image.scrollIntoViewIfNeeded();
  await expectImageLoaded(image);
  const display = await image.evaluate((img: HTMLImageElement) => {
    const box = img.getBoundingClientRect();
    return {
      src: img.currentSrc,
      width: box.width,
      height: box.height,
      fit: getComputedStyle(img).objectFit,
      dpr: devicePixelRatio,
    };
  });
  const url = new URL(display.src);
  expect(url.origin).toBe(origin);
  expect(url.pathname).toBe("/_next/image");
  expect(url.searchParams.get("q")).toBe("85");
  const source = url.searchParams.get("url")!;
  expect(source).toMatch(/^\/images\/jianghu\/[a-z0-9-]+\.(webp|png)$/);
  const original = await sharp(
    join(process.cwd(), "public", source),
  ).metadata();
  const response = await page.request.get(display.src);
  expect(response.ok()).toBeTruthy();
  const downloaded = await sharp(await response.body()).metadata();
  const ratio = original.width! / original.height!;
  // naturalWidth is density-corrected for srcset: inspect the downloaded bytes.
  // Cropped cover images may need more source pixels than the visible box width.
  const sourceCssWidth =
    display.fit === "cover"
      ? Math.max(display.width, display.height * ratio)
      : display.fit === "contain"
        ? Math.min(display.width, display.height * ratio)
        : display.width;
  const required = Math.min(
    original.width!,
    Math.ceil(sourceCssWidth * display.dpr),
  );
  expect(
    downloaded.width,
    JSON.stringify({
      source,
      downloaded: downloaded.width,
      required,
      ...display,
    }),
  ).toBeGreaterThanOrEqual(required - 1);
  expect(downloaded.size).toBeLessThanOrEqual(600_000);
}

async function inspect(page: Page, selector: string) {
  const images = page.locator(selector);
  expect(await images.count()).toBeGreaterThan(0);
  for (const image of await images.all()) await expectSharpImage(page, image);
}

// The isolated E2E server starts empty. This file runs before the content-writing
// workflow suites so the screenshot's empty-notes state is covered explicitly.
for (const dpr of [1, 2]) {
  test(`empty dashboard serves sharp assets at DPR ${dpr}`, async ({
    browser,
  }, testInfo) => {
    for (const width of widths) {
      // A fresh context avoids reusing a larger image after a viewport shrinks.
      const context = await browser.newContext({
        baseURL: origin,
        viewport: { width, height: 1000 },
        deviceScaleFactor: dpr,
      });
      try {
        const page = await context.newPage();
        await page.goto("/");
        const empty = page.locator(".illustrated-empty .note-thumbnail img");
        await expect(empty).toBeVisible();
        await inspect(
          page,
          ".hero-image, .ink-decoration, .illustrated-empty img, .featured-grid img",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await empty.scrollIntoViewIfNeeded();
        await page
          .locator(".recent-notes")
          .screenshot({
            path: testInfo.outputPath(`notes-hd-${width}-${dpr}x.png`),
          });
      } finally {
        await context.close();
      }
    }
  });
}

test.describe("populated HD image slots", () => {
  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext({ baseURL: origin });
    try {
      expect(
        (
          await request.post("/api/test-session", {
            headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
          })
        ).ok(),
      ).toBeTruthy();
      for (let i = 0; i < 3; i++) {
        const response = await request.post("/api/notes", {
          headers: { origin },
          data: {
            title: `HD 图片隔离验收 ${i + 1}`,
            stageId: "stage-01",
            body: "仅用于自动化图片尺寸验收的合成内容，不是学习成果。",
            tags: ["hd-image-test"],
            showInPortfolio: true,
            acknowledgedPublic: true,
          },
        });
        expect(response.ok(), await response.text()).toBeTruthy();
      }
      // Other suites use projects 0, 1 and 4. Keep this fixture separate.
      const definition = definitions.find((p) => p.projectNo === 5)!;
      const response = await request.post("/api/projects", {
        headers: { origin },
        data: {
          title: "HD 图片合成项目",
          projectNo: definition.projectNo,
          stageId: definition.stageId,
          checklist: definition.checklist.map((title) => ({
            title,
            completed: false,
          })),
          body: "## 项目背景\n\n仅用于作品集图片清晰度验收，不是真实项目成果。",
          showInPortfolio: true,
          acknowledgedPublic: true,
        },
      });
      expect(response.ok(), await response.text()).toBeTruthy();
    } finally {
      await request.dispose();
    }
  });

  for (const dpr of [1, 2]) {
    test(`note rows, all thumbnails and portfolio covers are sharp at DPR ${dpr}`, async ({
      browser,
    }) => {
      for (const width of widths) {
        const context = await browser.newContext({
          baseURL: origin,
          viewport: { width, height: 1000 },
          deviceScaleFactor: dpr,
        });
        try {
          const page = await context.newPage();
          for (const [route, selector] of [
            ["/", ".recent-notes .note-thumbnail img"],
            [
              "/notes?view=grid&tag=hd-image-test",
              ".knowledge-grid .note-thumbnail img",
            ],
            ["/projects", ".workspace-projects .project-thumbnail img"],
            [
              "/portfolio",
              ".hero-image, .bento-feature img, .portfolio-projects img",
            ],
          ]) {
            await test.step(`${route} at ${width}px / ${dpr}x`, async () => {
              await page.goto(route);
              await expect(page.locator(selector).first()).toBeVisible();
              await inspect(page, selector);
              expect(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              ).toBe(true);
            });
          }
        } finally {
          await context.close();
        }
      }
    });
  }
});

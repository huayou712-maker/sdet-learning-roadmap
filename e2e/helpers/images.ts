import { expect, type Locator, type Page } from "@playwright/test";

// Playwright's default caret hiding writes inline styles to every input,
// including hidden fields. During streamed hydration those mutations can be
// mistaken for application mismatches. Preserve DOM attributes while capturing.
// https://playwright.dev/docs/api/class-page#page-screenshot-option-caret
export const contentScreenshotOptions = { caret: "initial" as const };

/** Call only after the image has entered the viewport and triggered lazy loading. */
export async function expectImageLoaded(image: Locator) {
  await expect(image).toBeVisible();
  await expect
    .poll(
      () =>
        image.evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
      { message: "Visible image must load successfully: " + image.toString() },
    )
    .toBe(true);
}

async function expectViewportImagesLoaded(page: Page) {
  // Screenshot content only: do not couple local assets to the remote account avatar.
  for (const image of await page.locator("main img").all()) {
    if (!(await image.isVisible())) continue;
    const inViewport = await image.evaluate((img) => {
      const rect = img.getBoundingClientRect();
      return (
        rect.bottom > 0 &&
        rect.top < innerHeight &&
        rect.right > 0 &&
        rect.left < innerWidth
      );
    });
    if (inViewport) await expectImageLoaded(image);
  }
}

/** Trigger lazy images one viewport at a time before a full-page screenshot. */
export async function prepareContentScreenshot(page: Page) {
  // Bounded assertion, not an unbounded page.evaluate/fonts/decode promise.
  await expect
    .poll(() => page.evaluate(() => document.fonts.status))
    .toBe("loaded");
  let top = 0;
  for (let step = 0; step < 100; step++) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: "instant" }),
      top,
    );
    await expectViewportImagesLoaded(page);
    const position = await page.evaluate(() => ({
      bottom:
        scrollY + innerHeight >= document.documentElement.scrollHeight - 1,
      next: scrollY + Math.max(1, Math.floor(innerHeight * 0.8)),
    }));
    if (position.bottom) {
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await expectViewportImagesLoaded(page);
      return;
    }
    top = position.next;
  }
  throw new Error(
    "Screenshot content did not reach the bottom after 100 viewport steps",
  );
}

import { test, expect } from "@playwright/test";
import { contentScreenshotOptions } from "./helpers/images";

test("content screenshots preserve input attributes and focus, including hidden and Markdown-style checkboxes", async ({
  page,
}, testInfo) => {
  await page.setContent(`
    <main>
      <h1>合成截图验收</h1>
      <input type="hidden" name="view" value="list">
      <label>合成查询<input name="query" value="pytest"></label>
      <label>已核对<input type="checkbox" checked disabled></label>
      <label>说明<textarea>仅用于隔离截图回归。</textarea></label>
      <div contenteditable="true">合成可编辑区域</div>
    </main>
  `);
  await page.getByRole("textbox", { name: "合成查询" }).focus();
  await expect(page.getByRole("textbox", { name: "合成查询" })).toBeFocused();
  const before = await page.locator("main").innerHTML();
  await page.evaluate(() => {
    const probe = window as unknown as { screenshotStyleMutations: string[] };
    probe.screenshotStyleMutations = [];
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.target instanceof Element)
          probe.screenshotStyleMutations.push(
            record.target.tagName +
              ":" +
              record.oldValue +
              " -> " +
              record.target.getAttribute("style"),
          );
      }
    }).observe(document.querySelector("main")!, {
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["style"],
    });
  });
  await page.screenshot({
    ...contentScreenshotOptions,
    path: testInfo.outputPath("page.png"),
  });
  await page
    .locator("main")
    .screenshot({
      ...contentScreenshotOptions,
      path: testInfo.outputPath("component.png"),
    });
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { screenshotStyleMutations: string[] })
          .screenshotStyleMutations,
    ),
  ).toEqual([]);
  expect(await page.locator("main").innerHTML()).toBe(before);
  await expect(page.getByRole("textbox", { name: "合成查询" })).toBeFocused();
});

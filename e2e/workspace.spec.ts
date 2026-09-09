import { test, expect } from "@playwright/test";
import { prepareContentScreenshot } from "./helpers/images";

test("workspace navigation is keyboard accessible, owner-aware and reduced-motion safe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "打开快捷导航",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "快捷导航", exact: true });
  const input = dialog.getByRole("combobox", { name: "搜索页面或学习记录" });
  await expect(input).toBeFocused();
  await expect(
    dialog.getByRole("option", { name: /写学习笔记|回收站/ }),
  ).toHaveCount(0);
  await input.fill("projects");
  await expect(dialog.getByRole("option").first()).toContainText("项目");
  await input.press("ArrowDown");
  await expect(dialog.getByRole("option").last()).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await input.press("ArrowUp");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/projects$/);
  await expect(dialog).not.toBeVisible();

  await trigger.click();
  await input.fill("不存在的词 & route");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await expect(dialog.getByRole("option")).toHaveAttribute(
    "href",
    "/search?q=" + encodeURIComponent("不存在的词 & route"),
  );
  await input.press("Escape");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(input).toBeFocused();
  await input.press("Escape");

  await page.request.post("/api/test-session", {
    headers: {
      origin: "http://127.0.0.1:3100",
      "x-e2e-secret": "isolated-local-e2e-only",
    },
  });
  await page.goto("/");
  const journey = page.getByRole("region", { name: "十阶学习行迹" });
  await expect(journey.getByRole("link")).toHaveCount(10);
  await expect(journey.locator('[aria-current="step"]')).toHaveCount(1);
  await prepareContentScreenshot(page);
  await page.screenshot({
    path: "docs/design/v4/dashboard.png",
    fullPage: true,
  });
  await trigger.click();
  await input.fill("新建");
  await expect(dialog.getByRole("option").first()).toContainText("写学习笔记");
  await input.fill("");
  await page.screenshot({ path: "docs/design/v4/command-palette.png" });
  await input.press("Escape");

  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(trigger).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await trigger.click();
    await expect(input).toBeFocused();
    await expect(dialog).toBeInViewport();
    await input.press("Tab");
    await input.press("Shift+Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    expect(
      await dialog.evaluate(
        (element) => getComputedStyle(element).animationName,
      ),
    ).toBe("none");
    await input.press("Escape");
    expect(
      await page
        .locator(".page-enter")
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe("none");
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await prepareContentScreenshot(page);
  await page.screenshot({ path: "docs/design/v4/mobile.png", fullPage: true });
  await journey.getByRole("link").nth(1).click();
  await expect(page).toHaveURL(/\/roadmap\?stage=stage-02$/);
});

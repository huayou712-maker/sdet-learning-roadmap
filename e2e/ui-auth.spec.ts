import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:3100";
test("public login is visible outside drawer and explains missing configuration", async ({
  page,
}) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const login = page.getByRole("link", { name: "GitHub 登录（登录未配置）" });
    await expect(login).toBeVisible();
    await expect(login).toHaveAttribute("href", "/settings");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("link", { name: "GitHub 登录（登录未配置）" }).click();
  await expect(page.getByText(/缺少：AUTH_SECRET/)).toBeVisible();
  await expect(page.getByText(/数据分支：/)).toBeVisible();
  await expect(page.getByRole("button", { name: /保存并提交/ })).toHaveCount(0);
});
test("owner header and supplied assets remain usable on mobile", async ({
  page,
}) => {
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  const created = await page.request.post("/api/notes", {
    headers: { origin },
    data: {
      title: "UI 缩略图验收",
      stageId: "stage-01",
      body: "这是一份隔离测试笔记，用于确认配图、标题和排版。",
      tags: ["pytest"],
      showInPortfolio: true,
      acknowledgedPublic: true,
    },
  });
  expect(created.ok()).toBe(true);
  await page.goto("/");
  await expect(page.getByAltText("夕阳下的荒漠、关隘与远行者")).toBeVisible();
  await expect(
    page.locator(".recent-notes .note-thumbnail img").first(),
  ).toBeVisible();
  await expect(
    page.locator(".featured-grid .project-thumbnail img"),
  ).toHaveCount(3);
  await expect(page.locator(".core-stats>article")).toHaveCount(4);
  await expect(page.locator(".current-stage")).toContainText("下一步");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const account = page.getByLabel("GitHub 账户 huayou712-maker");
    await expect(account).toBeVisible();
    await account.click();
    await expect(page.getByText("所有者", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "回收站", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "退出登录", exact: true }),
    ).toBeEnabled();
    await account.press("Escape");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".hero-image")).toBeVisible();
    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images)
          .filter((i) => i.getAttribute("src")?.includes("jianghu"))
          .map((i) => i.decode().catch(() => undefined)),
      );
    });
    await page
      .getByRole("heading", { name: "SDET Learning OS", exact: true })
      .click();
    await page.screenshot({
      path:
        "test-results/dashboard-" +
        (width === 1440 ? "desktop" : "mobile") +
        "-v2.png",
      fullPage: true,
    });
  }
  await page.getByLabel("打开页面目录").click();
  await page
    .getByRole("navigation", { name: "全部页面" })
    .getByRole("link", { name: "日课", exact: true })
    .click();
  await expect(page).toHaveURL(/\/daily$/);
});

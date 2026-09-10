import { test, expect } from "@playwright/test";
import { prepareContentScreenshot } from "./helpers/images";

test("beginner path guides anonymous learners without writing progress, across mobile and desktop", async ({
  page,
}) => {
  const before = await (await page.request.get("/api/progress")).json();
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "当前学习入口" }),
  ).toContainText("入门主线 · 环境与 Python 诊断");
  await page.getByRole("link", { name: "查看学习路线", exact: true }).click();
  await expect(page).toHaveURL(/\/roadmap#task-start$/);
  const path = page.getByRole("region", { name: "先做出第一个可复现的测试" });
  await expect(path.locator("details")).toHaveCount(6);
  await expect(
    path.getByText("交付什么", { exact: true }).first(),
  ).toBeVisible();
  const ci = path.locator("#task-ci summary");
  await ci.focus();
  await ci.press("Enter");
  await expect(path.locator("#task-ci")).toContainText(
    "一次失败和一次修复后的 CI",
  );
  await expect(path.locator("#task-ci details")).toHaveAttribute("open", "");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await prepareContentScreenshot(page);
  await page.screenshot({
    path: "test-results/beginner-path-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: "test-results/beginner-path-mobile.png",
    fullPage: true,
  });
  await path.getByRole("link", { name: "入门指南与执行命令 →" }).click();
  await expect(
    page.getByRole("heading", { name: "初学者实践指南", exact: true }),
  ).toBeVisible();
  await expect(page.locator("article")).toContainText("py -3.12 -m venv .venv");
  await expect(page.locator("article")).not.toContainText("尚未包含入门指南");
  await expect(
    page.getByRole("link", { name: "在 GitHub 阅读任务文件 ↗" }),
  ).toHaveCount(6);
  expect(await (await page.request.get("/api/progress")).json()).toEqual(
    before,
  );
});

test("project editor saves a bonus without falsely completing CI requirements", async ({
  page,
  browser,
}) => {
  const origin = "http://127.0.0.1:3100";
  const login = await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  expect(login.ok()).toBe(true);
  await page.goto("/projects/project-4?edit=1");
  const checks = page.getByRole("group", { name: "项目验收清单", exact: true });
  await expect(
    checks.getByRole("heading", { name: "必做", exact: true }),
  ).toBeVisible();
  await checks.getByRole("checkbox", { name: "缓存 pip", exact: true }).check();
  await page.getByRole("checkbox", { name: /当前仓库为公开仓库/ }).check();
  await page
    .getByRole("button", { name: "保存并提交到 GitHub", exact: true })
    .click();
  await expect(page).toHaveURL(/\/projects\/project-4\?saved=/);
  await expect(page.locator(".project-summary")).toContainText("必做自评 0/6");
  await page.getByRole("link", { name: "Checklist", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "缓存 pip", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "checkout", exact: true }),
  ).not.toBeChecked();
  const anonymous = await browser.newContext();
  try {
    const publicPage = await anonymous.newPage();
    await publicPage.goto("/projects/project-4?tab=checklist");
    await expect(
      publicPage.getByRole("checkbox", { name: "checkout", exact: true }),
    ).toBeDisabled();
    await expect(publicPage.locator(".project-summary")).toContainText(
      "必做自评 0/6",
    );
  } finally {
    await anonymous.close();
  }
});

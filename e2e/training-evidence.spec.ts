import { test, expect, type Page } from "@playwright/test";
import {
  prepareContentScreenshot,
  contentScreenshotOptions,
} from "./helpers/images";
const origin = "http://127.0.0.1:3100";
async function owner(page: Page) {
  expect(
    (
      await page.request.post("/api/test-session", {
        headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
      })
    ).ok(),
  ).toBe(true);
}
async function addAttempt(page: Page, detected: boolean) {
  const previous = await (await page.request.get("/api/training")).json();
  const attempt = {
    id: crypto.randomUUID(),
    commitSha: "e".repeat(40),
    normal: "passed",
    faults: {
      age: detected ? "detected" : "missed",
      duplicate: "not_run",
      status: "not_run",
    },
    reflection: detected
      ? "R7 合成后次：补上年龄的状态与数据断言，报告仍需核对。"
      : "R7 合成前次：只检查响应成功，遗漏了年龄边界状态。",
    ciUrl:
      "https://github.com/huayou712-maker/sdet-learning-roadmap/actions/runs/123",
  };
  const response = await page.request.post("/api/training", {
    headers: { origin },
    data: {
      action: "attempt",
      attempt,
      sha: previous.sha,
      acknowledgedPublic: true,
    },
  });
  expect(response.ok()).toBe(true);
  return attempt;
}
test("comparison saves an ordinary debug without changing grades and can enter the existing review flow", async ({
  page,
}, testInfo) => {
  await owner(page);
  const first = await addAttempt(page, false);
  const second = await addAttempt(page, true);
  const training = (await (await page.request.get("/api/training")).json())
    .state;
  const progress = (await (await page.request.get("/api/progress")).json())
    .progress;
  await page.goto("/training?tab=compare");
  await page.getByLabel("较早尝试").selectOption(first.id);
  await page.getByLabel("较晚尝试").selectOption(second.id);
  await expect(
    page.getByText("两次提交 SHA 相同，不能声称代码已修改。"),
  ).toBeVisible();
  const comparison = page.getByRole("region", { name: "两次尝试的自报对照" });
  await expect(comparison.getByText("自报有变化", { exact: true })).toHaveCount(
    1,
  );
  await page.getByRole("button", { name: "准备排障草稿" }).click();
  const form = page.getByRole("form", { name: "失败对照排障草稿" });
  await form.getByLabel("排障标题").fill("R7 合成排障：年龄边界两次尝试对照");
  await form
    .getByLabel("现象", { exact: true })
    .fill("正常实现通过，但年龄边界第一次漏检");
  await form
    .getByLabel("排查过程", { exact: true })
    .fill("核对契约，分别查看 17 和 18 的状态与数据");
  await form
    .getByLabel("验证结果", { exact: true })
    .fill("第二次自报检出；还需要查看原始报告确认");
  page.once("dialog", (d) => d.dismiss());
  await page.getByLabel("较早尝试").selectOption(second.id);
  await expect(page.getByLabel("较早尝试")).toHaveValue(first.id);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    const tab = page
      .getByRole("navigation", { name: "训练导航" })
      .getByRole("link", { name: "失败对照", exact: true });
    await tab.scrollIntoViewIfNeeded();
    await expect(tab).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await prepareContentScreenshot(page);
    await page.screenshot({
      ...contentScreenshotOptions,
      path: testInfo.outputPath("comparison-" + width + ".png"),
      fullPage: true,
    });
  }
  await page.getByLabel(/当前仓库为公开仓库/).check();
  await form.getByRole("button", { name: "提交为排障记录" }).click();
  await expect(
    page.getByRole("link", { name: "查看已提交记录 →" }),
  ).toBeVisible();
  expect(
    (await (await page.request.get("/api/training")).json()).state,
  ).toEqual(training);
  expect(
    (await (await page.request.get("/api/progress")).json()).progress,
  ).toEqual(progress);
  await page.getByRole("link", { name: "查看已提交记录 →" }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "R7 合成排障：年龄边界两次尝试对照",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/以下来自 GitHub 训练档案/).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: /加入复习/ }).click();
  await expect(page).toHaveURL(/training\?tab=review&source=/);
});
test("CI lookup is explicit, surfaces failure and separates metadata from mastery", async ({
  page,
}, testInfo) => {
  await owner(page);
  const attempt = await addAttempt(page, true);
  let queries = 0;
  await page.route("**/api/training/verify", async (route) => {
    queries++;
    expect(route.request().postDataJSON()).toEqual({ attemptId: attempt.id });
    if (queries === 1)
      return route.fulfill({
        status: 503,
        json: { error: "GitHub 公开 API 配额不足，请稍后手动重试。" },
      });
    return route.fulfill({
      json: {
        level: "metadata_only",
        checkedAt: "2026-09-10T00:00:00Z",
        runId: 123,
        runAttempt: 1,
        runUrl: attempt.ciUrl,
        sourceMatches: true,
        commitMatches: true,
        workflowMatches: true,
        status: "success",
        jobStatus: "success",
        declaration: "demonstration",
        jobsTruncated: false,
        artifact: "expired",
        artifactsTruncated: false,
        reportContentVerified: false,
      },
    });
  });
  await page.goto("/training?tab=practice");
  const latest = page.getByRole("article", { name: /最近一次练习/ });
  expect(queries).toBe(0);
  await latest.getByRole("button", { name: "核对 CI 来源与版本" }).click();
  await expect(latest.getByRole("alert")).toContainText("配额不足");
  expect(queries).toBe(1);
  await latest.getByRole("button", { name: "核对 CI 来源与版本" }).click();
  await expect(
    latest.getByText("元数据核对结果 · 不代表练习验收通过"),
  ).toBeVisible();
  await expect(
    latest.getByText("仅识别到示范故障自检，不证明个人测试检出了故障"),
  ).toBeVisible();
  await expect(latest.getByText("产物已过期")).toBeVisible();
  await expect(latest.getByText(/报告内容未核验/)).toBeVisible();
  expect(queries).toBe(2);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) =>
        key.startsWith("sdet-draft-r7:"),
      ),
    ),
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 960 });
  await latest.scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await prepareContentScreenshot(page);
  await page.screenshot({
    ...contentScreenshotOptions,
    path: testInfo.outputPath("ci-evidence-390.png"),
    fullPage: true,
  });
});
test("anonymous visitors cannot inspect attempts or launch CI verification", async ({
  page,
  request,
}) => {
  await page.goto("/training?tab=compare");
  await expect(page.getByText("登录所有者账户后使用训练台")).toBeVisible();
  await expect(page.getByLabel("较早尝试")).toHaveCount(0);
  expect(
    (
      await request.post("/api/training/verify", {
        headers: { origin },
        data: { attemptId: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(401);
});

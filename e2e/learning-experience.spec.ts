import { test, expect } from "@playwright/test";
import { expectImageLoaded, prepareContentScreenshot } from "./helpers/images";
import definitions from "../data/projects.json";

const origin = "http://127.0.0.1:3100";
test("learning brief exposes real acceptance with keyboard and preserves progress", async ({
  page,
}, testInfo) => {
  const before = await (await page.request.get("/api/progress")).json();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expectImageLoaded(page.locator(".hero-image"));
    const brief = page.getByRole("region", { name: "当前学习入口" });
    await expect(brief).toContainText("交付：");
    const summary = brief.locator("summary");
    await summary.focus();
    await summary.press("Enter");
    await expect(brief.locator("details")).toHaveAttribute("open", "");
    await expect(brief.locator("details li").first()).toBeVisible();
    await expect(
      brief.getByRole("link", { name: /阅读学习笔记/ }),
    ).toHaveAttribute("href", "/notes");
    await expect(
      brief.getByRole("link", { name: /打开实践指南/ }),
    ).toHaveAttribute("href", "/guide/beginner");
    await expect(brief.getByRole("link", { name: /写学习笔记/ })).toHaveCount(
      0,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await brief.screenshot({
      path: testInfo.outputPath("brief-" + width + ".png"),
      // Component crops omit the sticky site chrome, covered by header E2E.
      style: ".topbar { visibility: hidden; }",
    });
    await summary.press("Enter");
    await expect(brief.locator("details")).not.toHaveAttribute("open");
  }
  expect(await (await page.request.get("/api/progress")).json()).toEqual(
    before,
  );
});

test("focus reading remains reversible on mobile and desktop without persistence or content writes", async ({
  page,
  browser,
}, testInfo) => {
  expect(
    (
      await page.request.post("/api/test-session", {
        headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
      })
    ).ok(),
  ).toBe(true);
  const response = await page.request.post("/api/notes", {
    headers: { origin },
    data: {
      title: "专注阅读隔离验收",
      stageId: "stage-02",
      body:
        "## 边界\n\n这里只是测试正文，不是学习记录。\n\n" +
        "一段用于检查阅读栏宽与滚动后退出的合成文字。\n\n".repeat(35) +
        "## 结论\n\n保持原文与目录锚点。",
      showInPortfolio: true,
      acknowledgedPublic: true,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const id = (await response.json()).id;
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method()))
      mutations.push(request.url());
  });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/notes/" + id);
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    const trigger = page.getByRole("button", { name: "专注阅读", exact: true });
    await trigger.focus();
    await trigger.press("Enter");
    const exit = page.getByRole("button", { name: "退出专注", exact: true });
    await expect(exit).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".reading-nav")).not.toBeVisible();
    await expect(page.locator(".reading-aside")).not.toBeVisible();
    const prose = page.locator(".reading-article .markdown");
    await expect(prose).toBeVisible();
    expect((await prose.boundingBox())!.width).toBeLessThanOrEqual(720);
    await page
      .getByRole("heading", { name: "结论", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(exit).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-pressed", "false");
    await expect(trigger).toBeFocused();
    await expect(page.locator(".reading-nav")).toBeVisible();
    await trigger.click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath("focus-" + width + ".png"),
    });
    await exit.click();
    await expect(trigger).toHaveAttribute("aria-pressed", "false");
    await trigger.click();
    await page.reload();
    await expect(trigger).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(
      stored,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(mutations).toEqual([]);
  const context = await browser.newContext({ baseURL: origin });
  try {
    const reader = await context.newPage();
    await reader.goto("/notes/" + id);
    await reader.getByRole("button", { name: "专注阅读", exact: true }).click();
    await expect(reader.locator(".reading-article")).toBeVisible();
    await expect(
      reader.getByRole("link", { name: "编辑笔记", exact: true }),
    ).toHaveCount(0);
    await reader.getByRole("button", { name: "退出专注", exact: true }).click();
    await expect(
      reader.getByRole("link", { name: "编辑笔记", exact: true }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("portfolio cases show actual sections, missing evidence and private-data boundaries", async ({
  page,
}, testInfo) => {
  expect(
    (
      await page.request.post("/api/test-session", {
        headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
      })
    ).ok(),
  ).toBe(true);
  const definition = definitions.find((project) => project.projectNo === 2)!;
  const response = await page.request.post("/api/projects", {
    headers: { origin },
    data: {
      title: "R4 合成案例验收",
      projectNo: 2,
      stageId: definition.stageId,
      body: "## 项目背景\n\n合成问题：接口边界。\n\n## 架构设计\n\n合成方法：参数化断言。\n\n## 测试范围\n\n合成验证：边界输入。\n\n## 成果\n\n合成结果：仅作 UI 验收。",
      checklist: definition.checklist.map((title) => ({
        title,
        completed: false,
      })),
      reportUrl: "https://example.com/r4-report",
      showInPortfolio: true,
      acknowledgedPublic: true,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const id = (await response.json()).id;
  for (const visible of [true, false]) {
    const debug = await page.request.post("/api/debug-journal", {
      headers: { origin },
      data: {
        title: visible ? "R4 公开复盘" : "R4 私有复盘不得泄露",
        stageId: definition.stageId,
        projectId: id,
        body: "隔离测试数据",
        showInPortfolio: visible,
        acknowledgedPublic: true,
      },
    });
    expect(debug.ok(), await debug.text()).toBe(true);
  }
  // All case assertions below run as an anonymous visitor.
  await page.context().clearCookies();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/portfolio");
    const article = page.getByRole("article", {
      name: "R4 合成案例验收案例",
      exact: true,
    });
    await expect(article).toContainText("合成方法：参数化断言。");
    await expect(article).toContainText("学习者自评 · 非自动测试结论");
    await expect(article).toContainText("尚未提供代码位置");
    expect(
      (await article.locator(".project-thumbnail").boundingBox())!.width,
    ).toBeGreaterThanOrEqual((await article.boundingBox())!.width - 64);
    await expect(
      article.getByRole("link", { name: "阅读完整项目 →" }).locator(".."),
    ).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(article).toContainText("已提供链接 · 未自动验真");
    await expect(
      article.getByRole("link", { name: "测试报告 ↗", exact: true }),
    ).toHaveAttribute("href", "https://example.com/r4-report");
    await expect(
      article.getByRole("link", { name: "R4 公开复盘 ↗", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("R4 私有复盘不得泄露", { exact: false }),
    ).toHaveCount(0);
    await article.locator("summary").click();
    await expect(article.locator("details .markdown")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await article.locator("summary").click();
    await prepareContentScreenshot(page);
    await article.screenshot({
      path: testInfo.outputPath("case-" + width + ".png"),
      style: ".topbar { visibility: hidden; }",
    });
  }
});

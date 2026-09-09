import { test, expect } from "@playwright/test";
import definitions from "../data/projects.json";
import { prepareContentScreenshot } from "./helpers/images";
const origin = "http://127.0.0.1:3100";
test("page-specific workflows, public reading, responsive layouts and V3 screenshots", async ({
  page,
  browser,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (m) => {
    if (/hydrated|hydration/i.test(m.text())) hydrationErrors.push(m.text());
  });
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  const note = await page.request.post("/api/notes", {
    headers: { origin },
    data: {
      title: "pytest fixture：隔离测试的边界",
      stageId: "stage-05",
      tags: ["pytest", "自动化"],
      body: "## 问题\n\n如何让每次测试独立运行？\n\n## 实践\n\n使用 fixture 管理连接和清理。\n\n```python\ndef test_isolation():\n    assert True\n```\n\n## 验证\n\n| 检查 | 结果 |\n| --- | --- |\n| 数据隔离 | 通过 |\n\n- [x] 保留测试证据",
      showInPortfolio: true,
      acknowledgedPublic: true,
    },
  });
  expect(note.ok()).toBeTruthy();
  const noteId = (await note.json()).id;
  const project = await page.request.post("/api/projects", {
    headers: { origin },
    data: {
      title: "API 自动化测试框架",
      projectNo: 1,
      checklist: definitions
        .find((p) => p.projectNo === 1)!
        .checklist.map((title) => ({ title, completed: false })),
      stageId: "stage-05",
      tags: ["Python", "pytest"],
      body: "## 项目背景\n\n验证接口在异常输入下的可靠性。\n\n## 架构设计\n\n客户端、数据层与断言分离。\n\n## 测试范围\n\n认证、参数校验与错误恢复。\n\n## 成果\n\n隔离验收示例，非真实生产成果。",
      status: "in_progress",
      showInPortfolio: true,
      acknowledgedPublic: true,
    },
  });
  expect(project.ok(), await project.text()).toBeTruthy();
  const submission = await page.request.post("/api/assignments", {
    headers: { origin },
    data: {
      title: "V3 接口作业提交",
      assignmentId: "project-1",
      stageId: "stage-05",
      body: "## 完成内容\n\n已验证隔离样例。\n\n## 反思\n\n保留可复现证据。",
      status: "submitted",
      acknowledgedPublic: true,
    },
  });
  expect(submission.ok(), await submission.text()).toBeTruthy();
  await page.goto("/notes?stage=stage-05&tag=pytest");
  await expect(page.locator(".knowledge-list")).toContainText("pytest fixture");
  await page.reload();
  await expect(page.getByLabel("标签", { exact: true })).toHaveValue("pytest");
  await page
    .getByRole("link", { name: "pytest fixture：隔离测试的边界", exact: true })
    .click();
  await expect(page.locator(".reading-article")).toBeVisible();
  await expect(page.getByLabel("Markdown 正文")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "文章目录" })
    .getByRole("link", { name: "实践" })
    .click();
  await expect(page).toHaveURL(/#section-5$/);
  await page.getByRole("link", { name: "编辑笔记", exact: true }).click();
  await expect(page.getByLabel("Markdown 正文")).toBeVisible();
  await page.goto("/assignments?status=submitted");
  await expect(page.getByRole("table")).toContainText("V3 接口作业提交");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "状态", exact: true }),
  ).toHaveValue("submitted");
  await page.goto("/projects/project-1?tab=checklist");
  await expect(page.getByRole("group", { name: "项目验收清单" })).toBeVisible();
  await page.getByRole("link", { name: "Notes", exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: "pytest fixture：隔离测试的边界",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/search");
  await expect(page.getByLabel("关键词")).toHaveAttribute(
    "data-shortcuts",
    "ready",
  );
  await page.keyboard.press("/");
  await expect(page.getByLabel("关键词")).toBeFocused();
  await page.getByLabel("关键词").fill("pytest");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("关键词")).toHaveValue("");
  const anonymous = await browser.newContext();
  const publicPage = await anonymous.newPage();
  await publicPage.goto(origin + "/notes/" + noteId);
  await expect(publicPage.locator(".reading-article")).toBeVisible();
  await expect(
    publicPage.getByRole("link", { name: "编辑笔记", exact: true }),
  ).toHaveCount(0);
  await expect(
    publicPage.getByRole("button", { name: "移入回收站" }),
  ).toHaveCount(0);
  await anonymous.close();
  const routes = [
    ["dashboard", "/"],
    ["roadmap", "/roadmap?stage=stage-05"],
    ["notes", "/notes"],
    ["note-detail", "/notes/" + noteId],
    ["assignments", "/assignments"],
    ["projects", "/projects"],
    ["project-detail", "/projects/project-1"],
    ["timeline", "/timeline"],
    ["portfolio", "/portfolio"],
  ];
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [name, url] of routes) {
    await page.goto(url);
    await expect(page.locator("main h1").first()).toBeVisible();
    await prepareContentScreenshot(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name,
    ).toBe(true);
    await page.screenshot({
      path: "docs/design/v3/" + name + ".png",
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  for (const [, url] of routes) {
    await page.goto(url);
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      url,
    ).toBe(true);
  }
  await page.goto("/notes");
  await page.getByRole("button", { name: "知识目录", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "知识目录" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/assignments");
  await page.getByRole("button", { name: "筛选作业", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "筛选作业" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/notes/" + noteId + "?edit=1");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(page.locator(".editor-preview")).toBeVisible();
  await page.goto("/portfolio");
  await prepareContentScreenshot(page);
  await page.screenshot({ path: "docs/design/v3/mobile.png", fullPage: true });
  expect(hydrationErrors).toEqual([]);
});

import { test, expect, type APIRequestContext } from "@playwright/test";
import roadmap from "../data/roadmap.json";
import { prepareContentScreenshot } from "./helpers/images";

const origin = "http://127.0.0.1:3100";
const headers = { origin };
const ciTopic = roadmap.beginnerPath[3].topicIds[0];
async function owner(request: APIRequestContext) {
  expect(
    (
      await request.post("/api/test-session", {
        headers: { ...headers, "x-e2e-secret": "isolated-local-e2e-only" },
      })
    ).ok(),
  ).toBe(true);
}
async function create(
  request: APIRequestContext,
  title: string,
  extra: Record<string, unknown> = {},
  kind = "notes",
) {
  const response = await request.post("/api/" + kind, {
    headers,
    data: {
      title,
      stageId: "stage-08",
      topicIds: [ciTopic],
      body: "## 我的理解\n\n先读失败步骤，再定位报告路径。这是隔离 UI 验收数据。\n\n## 验证\n\n保留失败产物，核对修复前后的同一条断言。",
      showInPortfolio: true,
      acknowledgedPublic: true,
      ...extra,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).id as string;
}

test("six-chapter journey supports hashes, keyboard, history and no-JS without writing progress", async ({
  page,
  browser,
}, testInfo) => {
  const before = await (await page.request.get("/api/progress")).json();
  const mutations: string[] = [];
  page.on("request", (r) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(r.method()))
      mutations.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/roadmap#task-ci");
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    const path = page.getByRole("region", { name: "先做出第一个可复现的测试" });
    const nav = path.getByRole("navigation", { name: "实践任务导航" });
    await expect(path.locator("details")).toHaveCount(6);
    await expect(path.locator("#task-ci details")).toHaveAttribute("open", "");
    await expect(path.locator("#task-ci summary")).toBeFocused();
    const data = nav.getByRole("link", { name: "数据与可靠性" });
    await data.focus();
    await data.press("Enter");
    await expect(page).toHaveURL(/#task-data$/);
    await expect(path.locator("#task-data details")).toHaveAttribute(
      "open",
      "",
    );
    await nav.getByRole("link", { name: "第一组接口测试" }).click();
    await expect(page).toHaveURL(/#task-api$/);
    await page.goBack();
    await expect(page).toHaveURL(/#task-data$/);
    await expect(path.locator("#task-data summary")).toBeFocused();
    await page.goForward();
    await expect(page).toHaveURL(/#task-api$/);
    await path.locator("#task-api summary").press("Enter");
    await expect(path.locator("#task-api details")).not.toHaveAttribute("open");
    await nav.getByRole("link", { name: "第一组接口测试" }).click();
    await expect(path.locator("#task-api details")).toHaveAttribute("open", "");
    await expect(path.locator("#task-api details > div")).toHaveCSS(
      "animation-name",
      "none",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(
      stored,
    );
    await prepareContentScreenshot(page);
    await path.screenshot({
      path: testInfo.outputPath("journey-" + width + ".png"),
      style: ".topbar { visibility: hidden; }",
    });
    await path.locator("#task-ci").screenshot({
      path: testInfo.outputPath("chapter-" + width + ".png"),
      style: ".topbar { visibility: hidden; }",
    });
  }
  expect(mutations).toEqual([]);
  expect(await (await page.request.get("/api/progress")).json()).toEqual(
    before,
  );
  const noJs = await browser.newContext({
    baseURL: origin,
    javaScriptEnabled: false,
  });
  try {
    const reader = await noJs.newPage();
    // Next's streaming shell requires JS to reveal its completed segment.
    // Test the actual SSR chapter markup independently, not a no-JS site promise.
    const response = await page.request.get("/roadmap");
    expect(response.ok()).toBe(true);
    await reader.setContent(await response.text());
    const chapterHtml = await reader
      .locator('[aria-labelledby="beginner-path-heading"]')
      .evaluate((element) => element.outerHTML);
    await reader.setContent(chapterHtml);
    const summary = reader.locator("#task-ci summary");
    await expect(summary).toBeVisible();
    await summary.focus();
    await summary.press("Enter");
    await expect(reader.locator("#task-ci details")).toHaveAttribute(
      "open",
      "",
    );
    await expect(
      reader.locator("#task-ci").getByRole("link", { name: "打开任务说明 →" }),
    ).toHaveAttribute("href", "/guide/beginner#task-ci");
  } finally {
    await noJs.close();
  }
});

test("note links and roadmap RSC respect owner/public/deleted visibility and focus mode", async ({
  page,
  browser,
}, testInfo) => {
  await owner(page.request);
  const source = await create(
    page.request,
    "从一次 CI 失败，理解可复现的测试（合成）",
  );
  const related = await create(
    page.request,
    "JUnit 报告路径核对（合成）",
    {},
    "debug-journal",
  );
  const hiddenTitle = "R6-private-never-serialize";
  const deletedTitle = "R6-deleted-never-serialize";
  const hidden = await create(page.request, hiddenTitle, {
    showInPortfolio: false,
  });
  const deleted = await create(page.request, deletedTitle);
  const initial = await (await page.request.get("/api/progress")).json();
  const linked = await page.request.patch("/api/progress/" + ciTopic, {
    headers,
    data: {
      completed: false,
      sha: initial.sha,
      acknowledgedPublic: true,
      evidence: [
        { type: "note", id: source },
        { type: "note", id: hidden },
        { type: "note", id: deleted },
      ],
    },
  });
  expect(linked.ok(), await linked.text()).toBe(true);
  const target = await (await page.request.get("/api/notes/" + deleted)).json();
  expect(
    (
      await page.request.delete("/api/notes/" + deleted, {
        headers,
        data: { sha: target.sha, acknowledgedPublic: true },
      })
    ).ok(),
  ).toBe(true);
  const publicContext = await browser.newContext({ baseURL: origin });
  try {
    await page.goto("/notes/" + source);
    const ownerConnections = page.getByRole("region", {
      name: "这篇笔记，用在何处",
      exact: true,
    });
    await expect(
      ownerConnections.getByRole("link", { name: hiddenTitle }),
    ).toBeVisible();
    await expect(ownerConnections).not.toContainText(deletedTitle);
    const reader = await publicContext.newPage();
    for (const route of [
      "/notes/" + source,
      "/roadmap",
      "/roadmap?stage=stage-08",
    ]) {
      for (const rsc of [false, true]) {
        const response = await publicContext.request.get(route, {
          headers: rsc ? { RSC: "1" } : {},
        });
        expect(response.ok()).toBe(true);
        if (rsc)
          expect(response.headers()["content-type"]).toContain(
            "text/x-component",
          );
        const serialized = await response.text();
        for (const marker of [hidden, hiddenTitle, deleted, deletedTitle])
          expect(serialized).not.toContain(marker);
      }
    }
    const before = await (
      await publicContext.request.get("/api/progress")
    ).json();
    const mutations: string[] = [];
    reader.on("request", (r) => {
      if (["POST", "PATCH", "PUT", "DELETE"].includes(r.method()))
        mutations.push(r.url());
    });
    for (const width of [1440, 390, 320]) {
      await reader.setViewportSize({ width, height: 900 });
      await reader.goto("/notes/" + source);
      const stored = await reader.evaluate(() => JSON.stringify(localStorage));
      const connections = reader.getByRole("region", {
        name: "这篇笔记，用在何处",
        exact: true,
      });
      await expect(connections).toContainText("共同知识点");
      await expect(
        connections.getByRole("link", { name: /JUnit 报告路径核对/ }),
      ).toHaveAttribute("href", "/debug-journal/" + related);
      await connections.locator("summary").click();
      await expect(connections).toContainText("笔记标注 · 已登记证据");
      await expect(
        connections.getByRole("link", { name: "GitHub Actions workflow →" }),
      ).toHaveAttribute("href", "/roadmap?stage=stage-08#" + ciTopic);
      expect(
        await reader.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await connections.screenshot({
        path: testInfo.outputPath("connections-" + width + ".png"),
        style: ".topbar { visibility: hidden; }",
      });
      await reader
        .getByRole("button", { name: "专注阅读", exact: true })
        .click();
      await expect(connections).not.toBeVisible();
      await reader.keyboard.press("Escape");
      await expect(connections).toBeVisible();
      await connections.getByRole("link", { name: /尽早接入最小 CI/ }).click();
      await expect(reader).toHaveURL(/\/roadmap#task-ci$/);
      await expect(reader.locator("#task-ci details")).toHaveAttribute(
        "open",
        "",
      );
      await expect(
        reader
          .locator("#task-ci")
          .getByRole("link", { name: /从一次 CI 失败/ }),
      ).toBeVisible();
      expect(await reader.evaluate(() => JSON.stringify(localStorage))).toBe(
        stored,
      );
    }
    expect(mutations).toEqual([]);
    expect(
      await (await publicContext.request.get("/api/progress")).json(),
    ).toEqual(before);
  } finally {
    await publicContext.close();
    // Restore only this test's synthetic trash item so the original recycle-bin E2E remains isolated.
    const trashed = await (
      await page.request.get("/api/notes/" + deleted)
    ).json();
    expect(
      (
        await page.request.post("/api/trash/" + deleted + "/restore", {
          headers,
          data: { sha: trashed.sha, acknowledgedPublic: true },
        })
      ).ok(),
    ).toBe(true);
    const latest = await (await page.request.get("/api/progress")).json();
    const previous = initial.progress.items[ciTopic];
    expect(
      (
        await page.request.patch("/api/progress/" + ciTopic, {
          headers,
          data: {
            completed: previous.completed,
            evidence: previous.evidence,
            sha: latest.sha,
            acknowledgedPublic: true,
          },
        })
      ).ok(),
    ).toBe(true);
  }
});

test("unlinked notes show an honest fallback and long titles fit a 320px reading surface", async ({
  page,
}, testInfo) => {
  await owner(page.request);
  const source = await create(page.request, "尚未标注知识点的合成笔记", {
    stageId: "stage-10",
    topicIds: [],
  });
  await page.goto("/notes/" + source);
  const connections = page.getByRole("region", {
    name: "这篇笔记，用在何处",
    exact: true,
  });
  await expect(connections).toContainText("没有已标注的有效知识点");
  await expect(connections).toContainText("暂无可展示的关联记录");
  const title =
    "同阶段长标题合成参考：" + "评测中的输入边界与失败归因".repeat(8);
  const related = await create(page.request, title, {
    stageId: "stage-10",
    topicIds: [],
  });
  await page.context().clearCookies();
  await page.setViewportSize({ width: 320, height: 900 });
  await page.reload();
  await expect(
    connections.getByRole("heading", { name: "同阶段参考" }),
  ).toBeVisible();
  await expect(connections).toContainText("同阶段参考 · 未建立知识点关联");
  await expect(connections.getByRole("link", { name: title })).toHaveAttribute(
    "href",
    "/notes/" + related,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await connections.screenshot({
    path: testInfo.outputPath("fallback-long-title-320.png"),
    style: ".topbar { visibility: hidden; }",
  });
});

import { test, expect, type Page } from "@playwright/test";
import { prepareContentScreenshot } from "./helpers/images";

const origin = "http://127.0.0.1:3100";
const codeRef = "e".repeat(40); // Only exists in the isolated E2E code fixture.
async function owner(page: Page) {
  expect(
    (
      await page.request.post("/api/test-session", {
        headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
      })
    ).ok(),
  ).toBe(true);
}
async function training(page: Page) {
  const response = await page.request.get("/api/training");
  expect(response.ok()).toBe(true);
  const { state, sha } = await response.json();
  return { state, sha };
}
async function seedAttempt(page: Page, reflection: string) {
  const { sha } = await training(page);
  const response = await page.request.post("/api/training", {
    headers: { origin },
    data: {
      action: "attempt",
      sha,
      acknowledgedPublic: true,
      attempt: {
        id: crypto.randomUUID(),
        commitSha: codeRef,
        normal: "passed",
        faults: { age: "detected", duplicate: "missed", status: "not_run" },
        reflection,
        ciUrl: "",
      },
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test("training commands and reversible evidence history work on keyboard and mobile without writes", async ({
  page,
}, testInfo) => {
  await owner(page);
  const older = "R5 较早的合成复盘：先运行正常实现，核对自己的测试。";
  const latest = "R5 最近的合成复盘：补充重复注册后原记录不被覆盖的断言。";
  await seedAttempt(page, older);
  await seedAttempt(page, latest);
  const before = await training(page);
  const progress = (await (await page.request.get("/api/progress")).json())
    .progress;
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method()))
      mutations.push(request.url());
  });
  // An isolated mock: never replace the user's actual system clipboard.
  await page.addInitScript(() => {
    const copied: string[] = [];
    Object.defineProperty(window, "__r5CopiedCommands", { value: copied });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          copied.push(text);
        },
      },
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 390, 320]) {
    await test.step(`commands and evidence at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/training?tab=practice");
      const stored = await page.evaluate(() => JSON.stringify(localStorage));
      const practice = page.getByRole("region", { name: "练习验收台" });
      const ledger = practice.getByRole("complementary", {
        name: "练习证据档案",
      });
      await expect(practice).toBeVisible();
      await expect(ledger.getByText(latest, { exact: true })).toBeVisible();
      await expect(ledger.getByText(older, { exact: true })).not.toBeVisible();
      await expect(ledger).toContainText("自报结果：检出 1 / 3 项");
      const earlier = ledger
        .locator("summary")
        .filter({ hasText: "更早的练习记录" });
      await earlier.focus();
      await earlier.press("Enter");
      await expect(ledger.getByText(older, { exact: true })).toBeVisible();
      await earlier.press("Enter");
      await expect(ledger.getByText(older, { exact: true })).not.toBeVisible();
      const hints = ledger
        .locator("summary")
        .filter({ hasText: "查看未检出项的检查提示" })
        .first();
      await hints.focus();
      await hints.press("Enter");
      await expect(
        ledger
          .getByText("补充重复注册后的记录数量与原记录不被覆盖的断言。", {
            exact: true,
          })
          .first(),
      ).toBeVisible();
      await hints.press("Enter");
      for (const title of ["正常实现", "故障自检"]) {
        const copy = practice.getByRole("button", {
          name: "复制" + title + "命令",
        });
        await copy.focus();
        await expect(copy).toBeFocused();
        await copy.press("Enter");
        await expect(copy.locator("../..").getByRole("status")).toContainText(
          "命令已复制",
        );
      }
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { __r5CopiedCommands: string[] })
              .__r5CopiedCommands,
        ),
      ).toEqual([
        ".\\.venv\\Scripts\\python.exe -m pytest tests/test_registration_practice.py -q",
        ".\\.venv\\Scripts\\python.exe selfcheck.py tests/test_registration_practice.py",
      ]);
      const steps = practice.getByRole("navigation", { name: "练习流程" });
      await steps.getByRole("link", { name: /记录结果/ }).click();
      await expect(page).toHaveURL(/#practice-form$/);
      await expect(page.getByLabel("独立测试的 commit SHA")).toBeInViewport();
      const reflectionBox = await practice
        .getByLabel("复盘与下一步")
        .boundingBox();
      expect(reflectionBox!.height).toBeGreaterThanOrEqual(112);
      expect(reflectionBox!.height).toBeLessThanOrEqual(180);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(
        stored,
      );
      await prepareContentScreenshot(page);
      const path = testInfo.outputPath("r5-practice-" + width + ".png");
      await practice.screenshot({
        path,
        style: ".topbar { visibility: hidden; }",
      });
      await testInfo.attach("R5 practice " + width, {
        path,
        contentType: "image/png",
      });
    });
  }
  expect(mutations).toEqual([]);
  expect(await training(page)).toEqual(before);
  expect(
    (await (await page.request.get("/api/progress")).json()).progress,
  ).toEqual(progress);
});

test("failed writes and reads show distinct feedback, retain drafts and never auto-resubmit", async ({
  page,
}, testInfo) => {
  await owner(page);
  await page.goto("/training?tab=practice");
  const before = await training(page);
  const draft = "R5 失败反馈验收：这是尚未提交的合成输入，需要保留。";
  await page.getByLabel(/当前仓库为公开仓库/).check();
  await page.getByLabel("独立测试的 commit SHA").fill(codeRef);
  await page.getByLabel("正常实现的测试结果").selectOption("passed");
  await page.getByLabel("复盘与下一步").fill(draft);
  const stored = await page.evaluate(() => JSON.stringify(localStorage));
  let posts = 0;
  let reads = 0;
  let releasePost = () => {};
  let releaseRead = () => {};
  const postGate = new Promise<void>((resolve) => {
    releasePost = resolve;
  });
  const readGate = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  await page.route("**/api/training", async (route) => {
    if (route.request().method() === "POST") {
      posts++;
      await postGate;
      await route.fulfill({
        status: 503,
        json: { error: "合成提交故障：上游暂时不可用" },
      });
    } else {
      reads++;
      if (reads === 1) {
        await readGate;
        await route.continue();
      } else
        await route.fulfill({
          status: 503,
          json: { error: "合成读取故障：连接暂时中断" },
        });
    }
  });
  const sync = page.getByRole("status", { name: "训练同步状态" });
  const submit = page.getByRole("button", {
    name: "提交练习记录",
    exact: true,
  });
  const refresh = page.getByRole("button", {
    name: "获取最新版本（保留输入）",
    exact: true,
  });
  try {
    await submit.click();
    await expect(sync).toContainText("正在提交到 GitHub");
    await expect(submit).toBeDisabled();
    await expect(refresh).toBeDisabled();
    releasePost();
    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toContainText("本次提交未确认成功");
    await expect(alert).toContainText("合成提交故障");
    await expect(page.getByLabel("复盘与下一步")).toHaveValue(draft);
    expect(posts).toBe(1);
    await refresh.click();
    await expect(sync).toContainText("正在读取 GitHub 最新版本");
    await expect(submit).toBeDisabled();
    await expect(refresh).toBeDisabled();
    await expect(page.getByLabel("复盘与下一步")).toHaveValue(draft);
    releaseRead();
    await expect(sync).toContainText("已获取最新版本");
    await expect(alert).toHaveCount(0);
    expect(posts).toBe(1);
    await refresh.click();
    await expect(alert).toContainText("最新版本读取失败");
    await expect(alert).toContainText("合成读取故障");
    await expect(sync).toBeEmpty();
    await expect(
      page.getByText(
        "已获取最新版本，表单输入保留。请核对历史后决定是否重试。",
        { exact: true },
      ),
    ).toHaveCount(0);
    await expect(page.getByLabel("复盘与下一步")).toHaveValue(draft);
    await expect(submit).toBeEnabled();
    expect(posts).toBe(1);
    expect(reads).toBe(2);
    expect(await training(page)).toEqual(before);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(
      stored,
    );
    await page.setViewportSize({ width: 390, height: 900 });
    await alert.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("r5-read-error-mobile.png"),
    });
  } finally {
    releasePost();
    releaseRead();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("restricted, missing and zero-budget states have actionable destinations without fake completion", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/training");
  await expect(page.getByText(/训练详情仅向所有者开放/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "公开实践指南 →" }),
  ).toHaveAttribute("href", "/guide/beginner");
  await expect(page.getByRole("form", { name: "提交独立练习" })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/notes/r5-missing-synthetic-record");
  await expect(
    page.getByRole("heading", { name: "这份记录不在这里" }),
  ).toBeVisible();
  await expect(
    page.getByText("记录不存在、已移入回收站，或未选择公开展示。", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "浏览可见笔记 →" }),
  ).toHaveAttribute("href", "/notes");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("r5-not-found-320.png") });
  const home = page.getByRole("link", { name: "返回学习首页", exact: true });
  await home.focus();
  await home.press("Enter");
  await expect(page).toHaveURL(origin + "/");
  await owner(page);
  const before = await training(page);
  const progress = (await (await page.request.get("/api/progress")).json())
    .progress;
  await page.goto("/training");
  await page.getByLabel("可用时间（分钟）").fill("0");
  const plan = page.getByRole("region", { name: "今日训练计划" });
  await expect(
    plan.getByRole("heading", { name: "先安排一点可用时间" }),
  ).toBeVisible();
  await expect(plan).toContainText("当前时间预算为 0 分钟");
  await expect(
    plan.getByRole("link", { name: "查看或创建复习卡 →" }),
  ).toHaveAttribute("href", "/training?tab=review");
  await expect(
    plan.getByRole("link", { name: "回顾学习路线 →" }),
  ).toHaveAttribute("href", "/roadmap");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await plan.screenshot({
    path: testInfo.outputPath("r5-empty-plan-320.png"),
    style: ".topbar { visibility: hidden; }",
  });
  expect(await training(page)).toEqual(before);
  expect(
    (await (await page.request.get("/api/progress")).json()).progress,
  ).toEqual(progress);
});

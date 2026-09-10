import { test, expect, type Page } from "@playwright/test";
import { prepareContentScreenshot } from "./helpers/images";
const origin = "http://127.0.0.1:3100";
const codeRef = "e".repeat(40); // Defined exclusively in the isolated E2E fixture.
async function owner(page: Page) {
  expect(
    (
      await page.request.post("/api/test-session", {
        headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
      })
    ).ok(),
  ).toBeTruthy();
}
async function fillPractice(page: Page, reflection: string) {
  await page.getByLabel(/当前仓库为公开仓库/).check();
  await page.getByLabel("独立测试的 commit SHA").fill(codeRef);
  await page.getByLabel("正常实现的测试结果").selectOption("passed");
  await page
    .getByRole("combobox", { name: "错误接受 17 岁", exact: true })
    .selectOption("detected");
  await page
    .getByRole("combobox", { name: "错误允许重复注册", exact: true })
    .selectOption("missed");
  await page
    .getByRole("combobox", { name: "错误返回 200", exact: true })
    .selectOption("detected");
  await page.getByLabel("复盘与下一步").fill(reflection);
}
test("training records real isolated writes, preserves progress and explains the latest miss", async ({
  page,
}) => {
  await owner(page);
  const before = (await (await page.request.get("/api/progress")).json())
    .progress;
  await page.goto("/training?tab=practice");
  await fillPractice(
    page,
    "E2E 独立尝试：重复注册后缺少记录数量断言，下次补充。",
  );
  await page.getByRole("button", { name: "提交练习记录", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已提交到 GitHub");
  await page.reload();
  await expect(
    page.getByText("E2E 独立尝试：重复注册后缺少记录数量断言，下次补充。", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("学习者自报 · 未自动验真", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "训练导航" })
    .getByRole("link", { name: "今日任务" })
    .click();
  await expect(
    page.getByRole("link", { name: "再次验证：错误允许重复注册" }),
  ).toBeVisible();
  const plan = page.getByRole("region", { name: "今日训练计划" });
  const titles = await plan
    .getByRole("heading", { level: 3 })
    .allTextContents();
  expect(titles.length).toBeGreaterThan(1);
  await plan
    .getByRole("button", { name: /^上移：/ })
    .nth(1)
    .click();
  await expect(plan.getByRole("heading", { level: 3 }).first()).toHaveText(
    titles[1],
  );
  await page.getByLabel("可用时间（分钟）").fill("20");
  await expect(page.getByText(/本次安排 20 \/ 20 分钟/)).toBeVisible();
  expect(
    (await (await page.request.get("/api/progress")).json()).progress,
  ).toEqual(before);
});
test("note-to-review requires answering and redo evidence, persists history and supports pause", async ({
  page,
}) => {
  await owner(page);
  const source = await page.request.post("/api/notes", {
    headers: { origin },
    data: {
      title: "E2E 训练来源：fixture 隔离",
      stageId: "stage-01",
      body: "合成记录：共享列表可能导致用例顺序依赖。",
      acknowledgedPublic: true,
    },
  });
  expect(source.ok()).toBeTruthy();
  const { id } = await source.json();
  await page.goto("/notes/" + id);
  await page.getByRole("link", { name: "加入复习 →" }).click();
  await page.getByLabel(/当前仓库为公开仓库/).check();
  const form = page.getByRole("form", { name: "创建复习卡" });
  await expect(form.getByLabel("来源记录")).toHaveValue(id);
  await form.getByLabel("验证方式").selectOption("code");
  await form.getByLabel("复习问题").fill("E2E：为什么整组运行失败而单独通过？");
  await form
    .getByLabel("参考答案")
    .fill("检查共享可变状态与 fixture 生命周期，并独立执行验证隔离。");
  await form.getByRole("button", { name: "创建复习卡", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已提交到 GitHub");
  const card = page.getByRole("article", {
    name: "E2E：为什么整组运行失败而单独通过？",
  });
  await expect(card.getByText("参考答案（由你编写）")).toHaveCount(0);
  await expect(
    card.getByRole("button", { name: "展开参考答案" }),
  ).toBeDisabled();
  await card
    .getByLabel("你的作答")
    .fill("可能是用例共享状态，先检查数据清理。");
  await expect(
    card.getByRole("button", { name: "展开参考答案" }),
  ).toBeDisabled();
  await card
    .getByLabel("重做命令与结果")
    .fill("pytest -q：复现顺序依赖，修复 fixture 后单独与整组都通过。");
  await card.getByRole("button", { name: "展开参考答案" }).click();
  await expect(card.getByText("参考答案（由你编写）")).toBeVisible();
  await card.getByRole("button", { name: /独立答对 · 3 天后/ }).click();
  await expect(card).toContainText("已记录 1 次");
  await page.reload();
  await expect(card).toContainText("已记录 1 次");
  await expect(card.getByRole("button", { name: "展开参考答案" })).toHaveCount(
    0,
  );
  await page.getByLabel(/当前仓库为公开仓库/).check();
  await card.getByRole("button", { name: "暂停复习" }).click();
  await expect(card.getByRole("button", { name: "恢复复习" })).toBeVisible();
  await card.getByRole("button", { name: "恢复复习" }).click();
  await expect(card.getByRole("button", { name: "暂停复习" })).toBeVisible();
  await card.getByText("查看复习历史（1）", { exact: true }).click();
  await expect(
    card.getByText("可能是用例共享状态，先检查数据清理。", { exact: true }),
  ).toBeVisible();
});
test("two-tab SHA conflict retains inputs and requires explicit refresh", async ({
  page,
  context,
}) => {
  await owner(page);
  const second = await context.newPage();
  await page.goto("/training?tab=practice");
  await second.goto("/training?tab=practice");
  await fillPractice(page, "E2E 并发 A：补充重复注册的数据校验。");
  const draft = "E2E 并发 B：这份尚未提交的复盘不能丢失。";
  await fillPractice(second, draft);
  await page.getByRole("button", { name: "提交练习记录", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已提交到 GitHub");
  await second
    .getByRole("button", { name: "提交练习记录", exact: true })
    .click();
  await expect(second.getByRole("main").getByRole("alert")).toContainText(
    "档案已更新",
  );
  await expect(second.getByLabel("复盘与下一步")).toHaveValue(draft);
  await second
    .getByRole("button", { name: "获取最新版本（保留输入）" })
    .click();
  await expect(second.getByRole("status")).toContainText("已获取最新版本");
  await expect(second.getByLabel("复盘与下一步")).toHaveValue(draft);
  await second
    .getByRole("button", { name: "提交练习记录", exact: true })
    .click();
  await expect(second.getByRole("status")).toContainText("已提交到 GitHub");
  await second.close();
});
test("training denies anonymous access and remains usable on mobile and keyboard", async ({
  page,
  request,
}, testInfo) => {
  expect((await request.get("/api/training")).status()).toBe(401);
  expect(
    (
      await request.post("/api/training", { headers: { origin }, data: {} })
    ).status(),
  ).toBe(401);
  await page.goto("/training");
  await expect(page.getByText(/训练详情仅向所有者开放/)).toBeVisible();
  await expect(page.getByRole("button", { name: "提交练习记录" })).toHaveCount(
    0,
  );
  await owner(page);
  await page.goto("/training?tab=practice");
  expect(
    (
      await page.request.post("/api/training", {
        headers: { origin: "https://evil.test" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByLabel("独立测试的 commit SHA").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("正常实现的测试结果")).toBeFocused();
    await prepareContentScreenshot(page);
    await page.screenshot({
      path: testInfo.outputPath("training-" + width + ".png"),
      fullPage: true,
    });
  }
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) =>
        /training|review|attempt/i.test(key),
      ),
    ),
  ).toEqual([]);
});

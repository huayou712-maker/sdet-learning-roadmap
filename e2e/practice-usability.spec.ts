import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:3100";
test("explicit training draft survives reload, blocks unintended leave and clears after a confirmed write", async ({
  page,
}) => {
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  await page.goto("/training?tab=practice");
  const form = page.getByRole("form", { name: "提交独立练习" });
  await form.getByLabel("独立测试的 commit SHA").fill("e".repeat(40));
  await form
    .getByLabel("复盘与下一步")
    .fill("R7 合成草稿：检查重复请求之后的数据数量。");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("sdet-draft-r7:")),
    ),
  ).toEqual([]);
  await form.getByRole("button", { name: "保存本机草稿", exact: true }).click();
  await expect(form.getByText(/本机草稿已保存/)).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(form.getByLabel("复盘与下一步")).toHaveValue("");
  await form.getByRole("button", { name: "恢复本机草稿", exact: true }).click();
  await expect(form.getByLabel("复盘与下一步")).toHaveValue(
    "R7 合成草稿：检查重复请求之后的数据数量。",
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("navigation", { name: "练习流程" })
    .locator("a")
    .first()
    .click();
  // In-page anchors keep the work intact and never prompt.
  await expect(form.getByLabel("复盘与下一步")).toHaveValue(
    "R7 合成草稿：检查重复请求之后的数据数量。",
  );
  await page.getByRole("link", { name: "环境准备与实践指南 →" }).click();
  await expect(page).toHaveURL(/training/);
  await page.getByLabel(/当前仓库为公开仓库/).check();
  await form.getByRole("button", { name: "提交练习记录", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已提交到 GitHub");
  expect(
    await page.evaluate(() =>
      localStorage.getItem(
        "sdet-draft-r7:huayou712-maker/sdet-learning-roadmap:practice",
      ),
    ),
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByRole("article", { name: /最近一次练习/ }),
  ).toContainText("R7 合成草稿");
});
test("search presents matching text safely and filters content types on mobile", async ({
  page,
}) => {
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  const response = await page.request.post("/api/notes", {
    headers: { origin },
    data: {
      title: "R7 检索上下文样例",
      stageId: "stage-01",
      body:
        "不相关的前文".repeat(80) +
        "R7检索[边界]+ <script>neverExecute()</script>",
      acknowledgedPublic: true,
    },
  });
  expect(response.ok()).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/search?q=" + encodeURIComponent("R7检索[边界]+") + "&type=note",
  );
  await expect(
    page.getByRole("link", { name: /R7 检索上下文样例/ }),
  ).toContainText("R7检索[边界]+");
  await expect(
    page.locator("mark").filter({ hasText: "R7检索[边界]+" }),
  ).toBeVisible();
  await page.getByLabel("内容类型").selectOption("assignment");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.getByText("没有匹配记录。")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

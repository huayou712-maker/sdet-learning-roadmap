import { test, expect, type Page } from "@playwright/test";
import {
  prepareContentScreenshot,
  contentScreenshotOptions,
} from "./helpers/images";
const origin = "http://127.0.0.1:3100";
let createdAssignment: string | undefined;
test.afterEach(async ({ page }) => {
  if (!createdAssignment) return;
  const id = createdAssignment;
  createdAssignment = undefined;
  // Clean only this test's synthetic record through the existing isolated API.
  const entry = await (
    await page.request.get(origin + "/api/assignments/" + id)
  ).json();
  expect(entry.title).toBe("R7 合成用例设计：注册状态与数据一致性");
  expect(entry.assignmentId).toBe("project-0");
  expect(
    (
      await page.request.delete(origin + "/api/assignments/" + id, {
        headers: { origin },
        data: { sha: entry.sha, acknowledgedPublic: true },
      })
    ).ok(),
  ).toBe(true);
  const deleted = await (
    await page.request.get(origin + "/api/assignments/" + id)
  ).json();
  expect(deleted.deletedAt).toBeTruthy();
  expect(
    (
      await page.request.post(origin + "/api/trash/" + id + "/permanent", {
        headers: { origin },
        data: { sha: deleted.sha, acknowledgedPublic: true },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (await page.request.get(origin + "/api/assignments/" + id)).status(),
  ).toBe(404);
});
async function owner(page: Page) {
  expect(
    (
      await page.request.post("/api/test-session", {
        headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
      })
    ).ok(),
  ).toBeTruthy();
}
async function fill(page: Page) {
  const form = page.getByRole("form", { name: "注册用例设计" });
  await form
    .getByLabel("作业标题")
    .fill("R7 合成用例设计：注册状态与数据一致性");
  const row = form.getByRole("group", { name: "用例 1", exact: true });
  const values = {
    用例名称: "重复注册后原用户不被覆盖",
    前置条件: "当前独立实例已有 username 为 case_user 的用户",
    输入与步骤:
      'POST /users，{"username":"case_user","age":18}，之后 GET /users',
    预期状态码: "409",
    预期响应: '{"error":"username_taken"}',
    预期数据变化: "用户数量保持 1，原用户字段不变",
    设计理由: "既验证接口错误，也验证没有错误副作用。",
  };
  await row.getByLabel("用例类型").selectOption("duplicate");
  for (const [label, value] of Object.entries(values))
    await row.getByLabel(label, { exact: true }).fill(value);
}
test("case design saves a normal assignment with provenance and no training/progress mutation", async ({
  page,
}) => {
  await owner(page);
  const progress = (await (await page.request.get("/api/progress")).json())
    .progress;
  const training = (await (await page.request.get("/api/training")).json())
    .state;
  await page.goto("/training?tab=design");
  await expect(
    page.getByRole("button", { name: "填写后对照提示" }),
  ).toBeDisabled();
  await fill(page);
  await page.getByRole("button", { name: "填写后对照提示" }).click();
  await expect(page.getByText("对照检查，不是标准答案")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "提交为 Project 0 作业" }),
  ).toBeDisabled();
  await page.getByLabel(/当前仓库为公开仓库/).check();
  const saved = page.waitForResponse(
    (response) =>
      response.url() === origin + "/api/assignments" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "提交为 Project 0 作业" }).click();
  const receipt = await saved;
  expect(receipt.ok()).toBe(true);
  createdAssignment = (await receipt.json()).id;
  await expect(
    page.getByRole("link", { name: "查看已提交记录 →" }),
  ).toBeVisible();
  expect(
    (await (await page.request.get("/api/progress")).json()).progress,
  ).toEqual(progress);
  expect(
    (await (await page.request.get("/api/training")).json()).state,
  ).toEqual(training);
  await page.getByRole("link", { name: "查看已提交记录 →" }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "R7 合成用例设计：注册状态与数据一致性",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/填写后已查看，可据此修订/)).toBeVisible();
  await expect(
    page.getByText(/不代表已执行、检出故障或通过能力验收/),
  ).toBeVisible();
});
test("case design remains readable on desktop/mobile, restores explicitly and never auto-retries", async ({
  page,
}, testInfo) => {
  await owner(page);
  await page.goto("/training?tab=design");
  await fill(page);
  const form = page.getByRole("form", { name: "注册用例设计" });
  await form.getByRole("button", { name: "保存本机草稿", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await form.getByRole("button", { name: "恢复本机草稿", exact: true }).click();
  await expect(form.getByLabel("预期状态码")).toHaveValue("409");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    const designLink = page
      .getByRole("navigation", { name: "训练导航" })
      .getByRole("link", { name: "用例设计", exact: true });
    await designLink.scrollIntoViewIfNeeded();
    await expect(designLink).toBeInViewport();
    await form.getByLabel("用例名称").scrollIntoViewIfNeeded();
    await expect(form.getByLabel("用例名称")).toBeVisible();
    await form.getByLabel("用例名称").focus();
    await expect(form.getByLabel("用例名称")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(form.getByLabel("前置条件")).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await prepareContentScreenshot(page);
    await page.screenshot({
      ...contentScreenshotOptions,
      path: testInfo.outputPath("case-design-" + width + ".png"),
      fullPage: true,
    });
  }
  await page.getByLabel(/当前仓库为公开仓库/).check();
  let writes = 0;
  await page.route("**/api/assignments", (route) => {
    if (route.request().method() === "POST") {
      writes++;
      return route.abort("failed");
    }
    return route.continue();
  });
  await page.getByRole("button", { name: "提交为 Project 0 作业" }).click();
  await expect(page.getByText(/提交结果待核对/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "提交为 Project 0 作业" }),
  ).toBeDisabled();
  expect(writes).toBe(1);
  await expect(form.getByLabel("预期状态码")).toHaveValue("409");
});
test("anonymous visitors cannot load the case editor or write its generated assignments", async ({
  page,
  request,
}) => {
  await page.goto("/training?tab=design");
  await expect(page.getByText("登录所有者账户后使用训练台")).toBeVisible();
  await expect(page.getByRole("form", { name: "注册用例设计" })).toHaveCount(0);
  expect(
    (
      await request.post("/api/assignments", { headers: { origin }, data: {} })
    ).status(),
  ).toBe(401);
});

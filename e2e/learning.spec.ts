import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:3100";
test("owner submits an assignment, records daily time and searches evidence", async ({
  page,
}) => {
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  await page.goto("/assignments/new");
  await page
    .getByLabel("标题", { exact: true })
    .fill("E2E assignment submission");
  await page.getByLabel(/当前仓库为公开仓库/).check();
  await page.getByRole("button", { name: "保存并提交到 GitHub" }).click();
  await expect(page).toHaveURL(/\/assignments\/[a-z0-9-]+\?saved=/);
  await expect(page.getByText(/当前迭代：1/)).toBeVisible();
  await page.goto("/daily/new");
  await page.getByLabel("标题", { exact: true }).fill("E2E daily learning");
  await page.getByLabel("实际时长（分钟）").fill("90");
  await page.getByLabel(/当前仓库为公开仓库/).check();
  await page.getByRole("button", { name: "保存并提交到 GitHub" }).click();
  await expect(page).toHaveURL(/\/daily\/daily-/);
  await page.goto("/search?q=E2E%20assignment");
  await expect(
    page.getByRole("link", { name: /E2E assignment submission/ }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("1.5 h", { exact: true })).toBeVisible();
});
test("public user is read-only, including direct write requests", async ({
  page,
  request,
}) => {
  await page.goto("/notes");
  await expect(page.getByRole("link", { name: "新建笔记" })).toHaveCount(0);
  const r = await request.post("/api/notes", {
    headers: { origin },
    data: { title: "unauthorized" },
  });
  expect(r.status()).toBe(401);
  await page.goto("/roadmap");
  await expect(page.getByRole("checkbox").first()).toBeDisabled();
});
test("owner creates, edits, views history, deletes, restores and updates progress", async ({
  page,
}) => {
  const auth = await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  expect(auth.ok()).toBeTruthy();
  await page.goto("/notes/new");
  await page.getByLabel("标题", { exact: true }).fill("E2E fixture evidence");
  await page
    .getByLabel("Markdown 正文")
    .fill("## 我的理解\n\nfixture isolates tests.");
  await page.getByLabel(/当前仓库为公开仓库/).check();
  await page.getByRole("button", { name: "保存并提交到 GitHub" }).click();
  await expect(page).toHaveURL(/\/notes\/[a-z0-9-]+\?saved=/);
  await expect(page.getByText(/已保存 · Commit:/).first()).toBeVisible();
  await page.getByLabel("标题", { exact: true }).fill("E2E edited fixture");
  await page.getByLabel(/当前仓库为公开仓库/).check();
  await page.getByRole("button", { name: "保存并提交到 GitHub" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "E2E edited fixture",
  );
  await page.getByRole("button", { name: "查看历史版本" }).click();
  await expect(
    page.getByRole("button", { name: /notes\(stage-01\): update/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "移入回收站" }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await page.goto("/trash");
  await expect(
    page.getByRole("heading", { name: "E2E edited fixture" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "恢复记录" }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByText("回收站为空。")).toBeVisible();
  await page.goto("/roadmap");
  await page.getByLabel(/当前仓库为公开仓库/).check();
  await page
    .getByRole("checkbox", { name: "理解网络分层", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Commit:");
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "理解网络分层", exact: true }),
  ).toBeChecked();
});

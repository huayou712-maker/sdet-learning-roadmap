import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:3100";
test("API protects visibility, SHA conflicts, evidence and uploads", async ({
  page,
  browser,
}) => {
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  const input = {
    title: "Hidden API record",
    stageId: "stage-01",
    body: "Initial content",
    acknowledgedPublic: true,
  };
  const created = await page.request.post("/api/notes", {
    headers: { origin },
    data: input,
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  const old = await (await page.request.get("/api/notes/" + id)).json();
  const changed = await page.request.put("/api/notes/" + id, {
    headers: { origin },
    data: { ...input, body: "Updated content", sha: old.sha },
  });
  expect(changed.ok()).toBeTruthy();
  const conflict = await page.request.put("/api/notes/" + id, {
    headers: { origin },
    data: { ...input, sha: old.sha },
  });
  expect(conflict.status()).toBe(409);
  const fresh = await page.request.get("/api/notes/" + id);
  expect((await fresh.json()).body).toContain("Updated content");
  const anon = await browser.newContext();
  const hidden = await anon.request.get(origin + "/api/notes/" + id);
  expect(hidden.status()).toBe(404);
  for (const kind of [
    "notes",
    "assignments",
    "projects",
    "daily",
    "debug-journal",
    "assets",
  ]) {
    const r = await anon.request.post(origin + "/api/" + kind, {
      headers: { origin },
      data: input,
    });
    expect(r.status()).toBe(401);
  }
  await anon.close();
  const progress = await (await page.request.get("/api/progress")).json();
  const item = progress.roadmap.stages[0].groups[0].items[0].id;
  const invalid = await page.request.patch("/api/progress/" + item, {
    headers: { origin },
    data: {
      completed: true,
      sha: progress.sha,
      acknowledgedPublic: true,
      evidence: [{ type: "note", id: "missing" }],
    },
  });
  expect(invalid.status()).toBe(400);
  const valid = await page.request.patch("/api/progress/" + item, {
    headers: { origin },
    data: {
      completed: true,
      sha: progress.sha,
      acknowledgedPublic: true,
      evidence: [{ type: "note", id }],
    },
  });
  expect(valid.ok()).toBeTruthy();
  const rejected = await page.request.post("/api/assets", {
    headers: { origin },
    multipart: {
      acknowledgedPublic: "true",
      file: {
        name: "app.zip",
        mimeType: "application/zip",
        buffer: Buffer.from("PK"),
      },
    },
  });
  expect(rejected.status()).toBe(415);
  const asset = await page.request.post("/api/assets", {
    headers: { origin },
    multipart: {
      acknowledgedPublic: "true",
      file: {
        name: "report.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Synthetic test report"),
      },
    },
  });
  expect(asset.ok()).toBeTruthy();
  expect(await asset.json()).toMatchObject({
    commit: expect.stringMatching(/^[a-f0-9]{40}$/),
    path: expect.stringMatching(/^content\/assets\//),
  });
});
test("desktop and mobile layouts fit; resources and portfolio render", async ({
  page,
}) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "SDET Learning OS", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width !== 768)
      await page.screenshot({
        path:
          "docs/design/dashboard-" +
          (width === 1440 ? "desktop" : "mobile") +
          ".png",
        fullPage: true,
      });
  }
  await page.goto("/portfolio");
  await expect(page.getByRole("heading", { name: "精选项目" })).toBeVisible();
  await page.goto("/resources");
  await expect(page.locator(".markdown")).toContainText("资源");
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  await page.goto("/notes/new");
  await expect(page.getByLabel("Markdown 正文")).toBeVisible();
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(page.locator(".editor-preview")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

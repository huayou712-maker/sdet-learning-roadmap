// Permanent browser security regression coverage.
import { test, expect } from "@playwright/test";
import definitions from "../data/projects.json";
const origin = "http://127.0.0.1:3100";
const headers = { origin };
const input = {
  title: "Security audit synthetic note",
  body: "Synthetic body",
  stageId: "stage-01",
  acknowledgedPublic: true,
};

test("security audit: browser renders hostile Markdown as inert content", async ({
  page,
}) => {
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  const response = await page.request.post("/api/notes", {
    headers,
    data: {
      ...input,
      showInPortfolio: true,
      body: '# Synthetic XSS audit\n\n<script>window.__auditXss = true</script>\n\n<img src=x onerror="window.__auditXss=true">\n\n[Unsafe link](javascript:window.__auditXss=true)\n\n![Unsafe image](data:text/html;base64,PHNjcmlwdD4=)',
    },
  });
  expect(response.ok()).toBeTruthy();
  const { id } = await response.json();
  await page.goto("/notes/" + id);
  await expect(page.locator(".reading-article")).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__auditXss,
    ),
  ).toBeUndefined();
  await expect(
    page.locator(
      ".reading-article script,.reading-article iframe,.reading-article [onerror],.reading-article [onload]",
    ),
  ).toHaveCount(0);
  expect(
    await page
      .getByRole("link", { name: "Unsafe link", exact: true })
      .getAttribute("href"),
  ).not.toMatch(/^javascript:/i);
});

test("security audit: HTTP API blocks CSRF, oversized bodies and unauthenticated uploads", async ({
  page,
  browser,
}) => {
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  for (const invalid of [
    "null",
    "https://attacker.invalid",
    origin + ".attacker.invalid",
  ]) {
    const r = await page.request.post("/api/notes", {
      headers: { origin: invalid },
      data: input,
    });
    expect(r.status()).toBe(403);
  }
  expect(
    (
      await page.request.post("/api/notes", {
        headers,
        data: { ...input, body: "A".repeat(200001) },
      })
    ).status(),
  ).toBe(413);
  expect(
    (
      await page.request.post("/api/notes", {
        headers,
        data: { ...input, path: ".env" },
      })
    ).status(),
  ).toBe(400);
  const anonymous = await browser.newContext();
  expect(
    (
      await anonymous.request.post(origin + "/api/assets", {
        headers,
        multipart: {
          acknowledgedPublic: "true",
          file: {
            name: "audit.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("synthetic"),
          },
        },
      })
    ).status(),
  ).toBe(401);
  const r = await anonymous.request.get(origin + "/settings");
  expect(r.headers()["x-content-type-options"]).toBe("nosniff");
  expect(r.headers()["x-frame-options"]).toBe("DENY");
  expect(r.headers()["access-control-allow-origin"]).toBeUndefined();
  // next dev returns no-cache; the production no-store policy is checked separately.
  expect(r.headers()["cache-control"]).toMatch(/no-cache|no-store/);
  await anonymous.close();
});

test("security audit: HTTP visibility and historical privacy hold across every content type", async ({
  page,
  browser,
}) => {
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  const definition = definitions[0];
  const variants = [
    ["notes", input],
    [
      "assignments",
      { ...input, assignmentId: definition.id, stageId: definition.stageId },
    ],
    [
      "projects",
      {
        ...input,
        projectNo: definition.projectNo,
        stageId: definition.stageId,
        checklist: definition.checklist.map((title) => ({
          title,
          completed: false,
        })),
      },
    ],
    ["daily", { ...input, date: "2099-02-01" }],
    ["debug-journal", input],
  ] as const;
  const anonymous = await browser.newContext();
  for (const [kind, payload] of variants) {
    const r = await page.request.post("/api/" + kind, {
      headers,
      data: payload,
    });
    expect(r.ok(), await r.text()).toBeTruthy();
    const { id, commit } = await r.json();
    const uri = origin + "/api/" + kind + "/" + id;
    expect((await anonymous.request.get(uri)).status()).toBe(404);
    expect((await anonymous.request.get(uri + "/history")).status()).toBe(404);
    expect(
      await (await anonymous.request.get(origin + "/api/" + kind)).text(),
    ).not.toContain(id);
    if (kind === "notes") {
      const old = await (await page.request.get(uri)).json();
      expect(
        (
          await page.request.put(uri, {
            headers,
            data: {
              ...input,
              showInPortfolio: true,
              body: "Public revision",
              sha: old.sha,
            },
          })
        ).ok(),
      ).toBeTruthy();
      expect((await anonymous.request.get(uri)).status()).toBe(200);
      expect(
        (await anonymous.request.get(uri + "/history?ref=" + commit)).status(),
      ).toBe(404);
    }
  }
  await anonymous.close();
});

test("security fixes: Markdown body is inert and credentials cannot enter note history", async ({
  page,
}) => {
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  const body =
    "---js\n(globalThis.__securityE2eCanary = true, {})\n---\nPreserved educational example";
  const created = await page.request.post("/api/notes", {
    headers,
    data: { ...input, body },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const { id } = await created.json();
  const uri = "/api/notes/" + id;
  const saved = await (await page.request.get(uri)).json();
  expect(saved.body).toBe(body);
  const token = "ghp_" + "Z".repeat(36);
  const rejected = await page.request.put(uri, {
    headers,
    data: { ...input, sha: saved.sha, body: token },
  });
  expect(rejected.status()).toBe(400);
  expect(await rejected.text()).not.toContain(token);
  const unchanged = await (await page.request.get(uri)).json();
  expect(unchanged.sha).toBe(saved.sha);
  expect(unchanged.body).toBe(body);
  expect(await (await page.request.get(uri + "/history")).json()).toHaveLength(
    1,
  );
  expect(
    (await page.request.get(uri + "/history?ref=" + "f".repeat(40))).status(),
  ).toBe(404);
  await page.goto("/notes/" + id);
  await expect(page.locator(".reading-article")).toContainText(
    "Preserved educational example",
  );
  expect(
    await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__securityE2eCanary,
    ),
  ).toBeUndefined();
});

test("security fixes: history pagination preserves access to versions older than the first page", async ({
  page,
}) => {
  await page.request.post("/api/test-session", {
    headers: { origin, "x-e2e-secret": "isolated-local-e2e-only" },
  });
  const payload = {
    ...input,
    title: "Pagination regression",
    body: "Oldest synthetic revision",
  };
  const created = await page.request.post("/api/notes", {
    headers,
    data: payload,
  });
  expect(created.ok()).toBeTruthy();
  const { id, commit } = await created.json();
  const uri = "/api/notes/" + id;
  for (let i = 1; i <= 30; i++) {
    const saved = await (await page.request.get(uri)).json();
    const updated = await page.request.put(uri, {
      headers,
      data: { ...payload, sha: saved.sha, body: "Revision " + i },
    });
    expect(updated.ok(), await updated.text()).toBeTruthy();
  }
  await page.goto("/notes/" + id);
  await page.getByRole("button", { name: "查看历史版本", exact: true }).click();
  await expect(page.locator(".history-feed li")).toHaveCount(30);
  await page.getByRole("button", { name: "加载更早版本", exact: true }).click();
  await expect(page.locator(".history-feed li")).toHaveCount(31);
  await expect(
    page.getByRole("button", { name: "加载更早版本", exact: true }),
  ).toHaveCount(0);
  await page
    .locator(".history-feed")
    .getByRole("button", { name: new RegExp("^" + commit.slice(0, 7)) })
    .click();
  await expect(
    page.getByText("Oldest synthetic revision", { exact: true }),
  ).toBeVisible();
});

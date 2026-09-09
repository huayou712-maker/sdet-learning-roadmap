// @vitest-environment node
// Permanent regression coverage from the 2026-09-09 security audit.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { encode } from "next-auth/jwt";
import { createHash } from "node:crypto";
import { Markdown } from "@/components/ui/markdown";
import { identity, testMode } from "@/lib/auth/session";
import { GET, POST, PUT, PATCH, DELETE } from "@/app/api/[...route]/route";
import { POST as upload } from "@/app/api/assets/route";
import { parseEntry } from "@/lib/content/format";
import { HISTORY_PAGE_SIZE } from "@/lib/github/history-policy";
import { validateAsset, MAX_ASSET_BYTES } from "@/lib/content/assets";
import { writablePath } from "@/lib/github/paths";
import type { Repository, TextFile, CommitInfo } from "@/lib/github/types";
import roadmap from "../data/roadmap.json";
import projects from "../data/projects.json";

const state = vi.hoisted(() => ({
  cookie: "",
  repo: null as unknown as Repository,
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    toString: () => state.cookie,
    get: (name: string) => {
      const value = state.cookie
        .split("; ")
        .find((c) => c.startsWith(name + "="))
        ?.slice(name.length + 1);
      return value === undefined ? undefined : { value };
    },
  }),
}));
vi.mock("@/lib/github/contents", () => ({ repository: () => state.repo }));

const origin = "http://security-audit.test";
const secret = "synthetic-security-audit-secret-not-a-production-credential";
const input = {
  title: "Synthetic audit record",
  stageId: "stage-01",
  body: "Audit body",
  acknowledgedPublic: true,
};
const hash = (s: string) => createHash("sha1").update(s).digest("hex");
let files: Map<string, TextFile>;
let histories: Map<string, CommitInfo[]>;
let versions: Map<string, TextFile>;
const methods = { GET, POST, PUT, PATCH, DELETE };
async function owner(login = "huayou712-maker", maxAge = 3600) {
  state.cookie =
    "next-auth.session-token=" +
    (await encode({ token: { githubLogin: login }, secret, maxAge }));
}
async function call(
  method: keyof typeof methods,
  path: string,
  data?: unknown,
  requestOrigin: string | null = origin,
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (requestOrigin !== null) headers.origin = requestOrigin;
  const req = new Request(origin + "/api/" + path, {
    method,
    headers,
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  return methods[method](req, {
    params: Promise.resolve({ route: path.split("?")[0].split("/") }),
  });
}
async function addNote(showInPortfolio = false) {
  await owner();
  const response = await call("POST", "notes", { ...input, showInPortfolio });
  expect(response.status).toBe(200);
  return (await response.json()).id as string;
}
// Stay within the JWT library's supported Unix timestamp range.
let testClock = Date.UTC(2026, 8, 10);
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime((testClock += 3600001));
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("AUTH_SECRET", secret);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
  vi.stubEnv("NEXTAUTH_URL", origin);
  vi.stubEnv("ALLOWED_GITHUB_LOGIN", "huayou712-maker");
  vi.stubEnv("E2E_ADAPTER", "");
  vi.stubEnv("E2E_SECRET", "");
  vi.stubEnv("GITHUB_WRITE_TOKEN", "");
  state.cookie = "";
  files = new Map();
  histories = new Map();
  versions = new Map();
  const put = async (
    path: string,
    content: string,
    message: string,
    expected?: string,
  ) => {
    if (expected ? files.get(path)?.sha !== expected : files.has(path))
      throw new Error("synthetic conflict");
    const sha = hash(content);
    const commit = hash(path + message + Math.random());
    const file = { path, content, sha };
    files.set(path, file);
    versions.set(path + ":" + commit, file);
    histories.set(path, [
      {
        sha: commit,
        message,
        date: new Date().toISOString(),
        url: "https://github.com/example/test/commit/" + commit,
      },
      ...(histories.get(path) || []),
    ]);
    return commit;
  };
  state.repo = {
    getTextFile: vi.fn(async (p) => files.get(p) || null),
    listDirectory: vi.fn(async (p) =>
      [...files.keys()].filter((f) => f.startsWith(p + "/")),
    ),
    createTextFile: vi.fn((p, c, m) => put(p, c, m)),
    createBinaryFile: vi.fn((p, c, m) => put(p, c.toString(), m)),
    updateTextFile: vi.fn((p, s, c, m) => put(p, c, m, s)),
    deleteFile: vi.fn(async (p) => {
      files.delete(p);
      return hash(p);
    }),
    getCommitsForPath: vi.fn(async (p, page = 1) =>
      (histories.get(p) || []).slice(
        (page - 1) * HISTORY_PAGE_SIZE,
        page * HISTORY_PAGE_SIZE,
      ),
    ),
    getTextFileAtRef: vi.fn(async (p, r) => versions.get(p + ":" + r) || null),
  };
  for (const [path, data] of [
    ["data/roadmap.json", roadmap],
    ["data/projects.json", projects],
    ["data/progress.json", { version: 1, items: {}, updatedAt: null }],
  ] as const) {
    const content = JSON.stringify(data);
    files.set(path, { path, content, sha: hash(content) });
  }
  delete (globalThis as Record<string, unknown>).__securityAuditCanary;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  delete (globalThis as Record<string, unknown>).__securityAuditCanary;
});

it("accepts a valid owner JWT but rejects tampered and expired JWTs", async () => {
  await owner();
  expect(await identity()).toEqual({ login: "huayou712-maker" });
  state.cookie += "tampered";
  expect(await identity()).toBeNull();
  await owner("huayou712-maker", -120);
  expect(await identity()).toBeNull();
});
it("does not trust a display-name-only JWT", async () => {
  state.cookie =
    "next-auth.session-token=" +
    (await encode({ token: { name: "huayou712-maker" }, secret }));
  expect(await identity()).toBeNull();
});
it("disables the test owner cookie and test-session endpoint in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("E2E_ADAPTER", "1");
  vi.stubEnv("E2E_SECRET", "synthetic");
  state.cookie = "e2e-owner=synthetic";
  expect(testMode()).toBe(false);
  expect(await identity()).toBeNull();
  expect((await call("POST", "test-session", {})).status).toBe(404);
});
it.each(["notes", "assignments", "projects", "daily", "debug-journal"])(
  "rejects anonymous CRUD for %s",
  async (kind) => {
    for (const [method, path] of [
      ["POST", kind],
      ["PUT", kind + "/audit-id"],
      ["DELETE", kind + "/audit-id"],
    ] as const)
      expect((await call(method, path, input)).status).toBe(401);
  },
);
it("rejects anonymous progress and trash mutations", async () => {
  for (const path of ["trash/audit-id/restore", "trash/audit-id/permanent"])
    expect((await call("POST", path, {})).status).toBe(401);
  expect((await call("PATCH", "progress/audit-id", {})).status).toBe(401);
});
it.each(["notes", "assignments", "projects", "daily", "debug-journal"])(
  "rejects an authenticated non-owner for %s",
  async (kind) => {
    await owner("untrusted-audit-user");
    expect((await call("POST", kind, input)).status).toBe(403);
  },
);
it.each([
  null,
  "null",
  "https://attacker.invalid",
  "http://security-audit.test.attacker.invalid",
])("rejects owner write with invalid Origin %s", async (invalidOrigin) => {
  await owner();
  expect((await call("POST", "notes", input, invalidOrigin)).status).toBe(403);
});
it("does not expose a hidden record through detail, list, history, search or timeline", async () => {
  const id = await addNote(false);
  state.cookie = "";
  for (const path of ["notes/" + id, "notes/" + id + "/history"])
    expect((await call("GET", path)).status).toBe(404);
  for (const path of ["notes", "search?q=Synthetic", "timeline"])
    expect(await (await call("GET", path)).text()).not.toContain(
      "Synthetic audit record",
    );
});
it("hides non-public historical content after a record is made public", async () => {
  const id = await addNote(false);
  const old = await (await call("GET", "notes/" + id)).json();
  const commits = await (await call("GET", "notes/" + id + "/history")).json();
  expect(
    (
      await call("PUT", "notes/" + id, {
        ...input,
        body: "Now public",
        showInPortfolio: true,
        sha: old.sha,
      })
    ).status,
  ).toBe(200);
  state.cookie = "";
  expect((await call("GET", "notes/" + id)).status).toBe(200);
  expect(
    (await call("GET", "notes/" + id + "/history?ref=" + commits[0].sha))
      .status,
  ).toBe(404);
  expect(
    await (await call("GET", "notes/" + id + "/history")).text(),
  ).not.toContain(input.title);
});
it("hides trashed public records", async () => {
  const id = await addNote(true);
  const old = await (await call("GET", "notes/" + id)).json();
  expect(
    (
      await call("DELETE", "notes/" + id, {
        sha: old.sha,
        acknowledgedPublic: true,
      })
    ).status,
  ).toBe(200);
  state.cookie = "";
  expect((await call("GET", "notes/" + id)).status).toBe(404);
});
it.each([
  { path: ".env" },
  { stageId: "../stage-01" },
  { showInPortfolio: "true" },
  { topicIds: ["does-not-exist"] },
  { acknowledgedPublic: false },
])("rejects untrusted write fields %j", async (override) => {
  await owner();
  expect((await call("POST", "notes", { ...input, ...override })).status).toBe(
    400,
  );
  expect(state.repo.createTextFile).not.toHaveBeenCalled();
});
it("checks asset authentication before parsing multipart bodies", async () => {
  const response = await upload(
    new Request(origin + "/api/assets", {
      method: "POST",
      headers: { origin },
      body: "garbage",
    }),
  );
  expect(response.status).toBe(401);
});
it.each([
  ".env.txt",
  "../report.txt",
  "a.exe",
  "a.svg",
  "a.zip",
  "nested/report.txt",
  "C:\\data.txt",
])("blocks unsafe upload name %s", (name) => {
  expect(() =>
    validateAsset(name, "text/plain", Buffer.from("synthetic")),
  ).toThrow();
});
it("blocks spoofed images, oversized content and known synthetic token formats", () => {
  expect(() =>
    validateAsset("picture.png", "image/png", Buffer.from("not png")),
  ).toThrow();
  expect(() =>
    validateAsset(
      "report.txt",
      "text/plain",
      Buffer.alloc(MAX_ASSET_BYTES + 1, 65),
    ),
  ).toThrow();
  expect(() =>
    validateAsset(
      "report.txt",
      "text/plain",
      Buffer.from("ghp_" + "A".repeat(36)),
    ),
  ).toThrow();
});
it.each([
  "../x",
  "content/../../.env",
  "content/%2e%2e/.env",
  "content\\..\\x",
  "/etc/passwd",
  ".github/workflows/a.yml",
  "data/roadmap.json",
])("blocks write path %s", (path) => {
  expect(() => writablePath(path)).toThrow();
});
it("renders raw HTML and javascript URLs without executable DOM", () => {
  const html = renderToStaticMarkup(
    <Markdown
      body={
        '<script>globalThis.canary=1</script>\n\n<img src=x onerror="globalThis.canary=1">\n\n[click](javascript:alert(1))\n\n![x](data:text/html;base64,PHNjcmlwdD4=)'
      }
    />,
  );
  expect(html).not.toMatch(
    /<(script|iframe|object|embed)\b|<[^>]+\son(error|load)=/i,
  );
  for (const match of html.matchAll(/(?:href|src)="([^"]*)"/g))
    expect(match[1]).not.toMatch(/^(javascript|data|vbscript):/i);
});
it("must not execute JavaScript front matter while saving a note", async () => {
  await owner();
  const body =
    "---js\n(globalThis.__securityAuditCanary = 'save-executed', {})\n---\nSynthetic body";
  const response = await call("POST", "notes", { ...input, body });
  expect(response.status).toBe(200);
  const { id } = await response.json();
  const saved = await (await call("GET", "notes/" + id)).json();
  expect(saved.body).toBe(body);
  expect(state.repo.createTextFile).toHaveBeenCalledTimes(1);
  expect(
    (globalThis as Record<string, unknown>).__securityAuditCanary,
  ).toBeUndefined();
});
it("must not execute JavaScript front matter before validating repository content", () => {
  try {
    parseEntry(
      "content/notes/audit.md",
      "---javascript\n(globalThis.__securityAuditCanary = 'read-executed', {})\n---\nBody",
      "a".repeat(40),
    );
  } catch {
    /* Invalid metadata should be rejected without side effects. */
  }
  expect(
    (globalThis as Record<string, unknown>).__securityAuditCanary,
  ).toBeUndefined();
});
it("must not execute a hidden repository record during an anonymous list request", async () => {
  const metadata = {
    id: "audit-hidden-poison",
    type: "note",
    title: "Hidden canary",
    stageId: "stage-01",
    createdAt: "2026-09-09",
    updatedAt: "2026-09-09",
    deletedAt: null,
    showInPortfolio: false,
  };
  const path = "content/notes/stage-01/audit-hidden-poison.md";
  const content =
    "---js\n(globalThis.__securityAuditCanary = 'anonymous-read-executed', " +
    JSON.stringify(metadata) +
    ")\n---\nSynthetic body";
  files.set(path, { path, content, sha: hash(content) });
  const response = await call("GET", "notes");
  // Unsafe repository metadata fails closed; it is not silently ignored.
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("anonymous-read-executed");
  expect(
    (globalThis as Record<string, unknown>).__securityAuditCanary,
  ).toBeUndefined();
});
it("must reject known credential formats in note bodies before writing a public commit", async () => {
  await owner();
  const response = await call("POST", "notes", {
    ...input,
    body: "Synthetic credential: ghp_" + "A".repeat(36),
  });
  expect(response.status).toBe(400);
  expect(state.repo.createTextFile).not.toHaveBeenCalled();
});
it("must not query arbitrary uncatalogued history refs for anonymous callers", async () => {
  const id = await addNote(true);
  state.cookie = "";
  for (let i = 1; i <= 5; i++)
    await call(
      "GET",
      "notes/" + id + "/history?ref=" + i.toString(16).padStart(40, "0"),
    );
  expect(state.repo.getTextFileAtRef).not.toHaveBeenCalled();
});

it.each(["notes", "assignments", "projects", "daily", "debug-journal"])(
  "blocks credential bodies for %s before creating or updating a commit",
  async (kind) => {
    await owner();
    const definition = projects[0];
    const extra =
      kind === "assignments"
        ? { assignmentId: definition.id, stageId: definition.stageId }
        : kind === "projects"
          ? {
              projectNo: definition.projectNo,
              stageId: definition.stageId,
              checklist: definition.checklist.map((title) => ({
                title,
                completed: false,
              })),
            }
          : kind === "daily"
            ? { date: "2099-04-02" }
            : {};
    const payload = { ...input, ...extra };
    const created = await call("POST", kind, payload);
    expect(created.status).toBe(200);
    const { id } = await created.json();
    const saved = await (await call("GET", kind + "/" + id)).json();
    vi.mocked(state.repo.createTextFile).mockClear();
    const token = "github_pat_" + "S".repeat(40);
    for (const [method, path, data] of [
      ["POST", kind, { ...payload, body: token }],
      ["PUT", kind + "/" + id, { ...payload, sha: saved.sha, body: token }],
    ] as const) {
      const response = await call(method, path, data);
      expect(response.status).toBe(400);
      expect(await response.text()).not.toContain(token);
    }
    expect(state.repo.createTextFile).not.toHaveBeenCalled();
    expect(state.repo.updateTextFile).not.toHaveBeenCalled();
  },
);
it.each([
  { title: "ghp_" + "A".repeat(36) },
  { checklist: [{ title: "gho_" + "B".repeat(36), completed: false }] },
  { reportUrl: "https://example.test/?token=github_pat_" + "C".repeat(40) },
  { mood: "ghs_" + "D".repeat(36) },
  { repositoryPath: "projects/ghr_" + "E".repeat(36) },
])("blocks credentials in record metadata %j", async (fields) => {
  await owner();
  const response = await call("POST", "debug-journal", { ...input, ...fields });
  expect(response.status).toBe(400);
  expect(state.repo.createTextFile).not.toHaveBeenCalled();
});
it("rejects malformed history parameters before repository reads", async () => {
  for (const query of [
    "ref=main",
    "ref=",
    "page=0",
    "page=-1",
    "page=1.5",
    "page=NaN",
    "page=1e3",
    "page=9007199254740993",
  ]) {
    expect((await call("GET", "notes/synthetic/history?" + query)).status).toBe(
      400,
    );
  }
  expect(state.repo.listDirectory).not.toHaveBeenCalled();
  expect(state.repo.getCommitsForPath).not.toHaveBeenCalled();
  expect(state.repo.getTextFileAtRef).not.toHaveBeenCalled();
});
it("loads older history pages and verifies refs against that exact record and page", async () => {
  const id = await addNote(true);
  const file = [...files.values()].find((f) => f.path.startsWith("content/"))!;
  const commits = Array.from({ length: HISTORY_PAGE_SIZE + 1 }, (_, index) => ({
    sha: hash("version-" + index),
    message: "Synthetic " + index,
    date: "2099-01-01",
    url: "#",
  }));
  histories.set(file.path, commits);
  for (const commit of commits)
    versions.set(file.path + ":" + commit.sha, file);
  state.cookie = "";
  const first = await call("GET", "notes/" + id + "/history");
  expect(await first.json()).toHaveLength(HISTORY_PAGE_SIZE);
  expect(first.headers.get("x-history-next-page")).toBe("2");
  const second = await call("GET", "notes/" + id + "/history?page=2");
  expect(await second.json()).toHaveLength(1);
  expect(second.headers.get("x-history-next-page")).toBeNull();
  const oldRef = commits[HISTORY_PAGE_SIZE].sha;
  expect(
    (await call("GET", "notes/" + id + "/history?ref=" + oldRef)).status,
  ).toBe(404);
  expect(state.repo.getTextFileAtRef).not.toHaveBeenCalled();
  expect(
    (await call("GET", "notes/" + id + "/history?page=2&ref=" + oldRef)).status,
  ).toBe(200);
  const unrelated = hash("unrelated-branch");
  versions.set(file.path + ":" + unrelated, file);
  expect(
    (await call("GET", "notes/" + id + "/history?ref=" + unrelated)).status,
  ).toBe(404);
  expect(state.repo.getTextFileAtRef).toHaveBeenCalledTimes(1);
});
it("limits anonymous history queries across spoofed IPs, returns Retry-After, and recovers", async () => {
  const id = await addNote(true);
  state.cookie = "";
  const path = "notes/" + id + "/history";
  for (let i = 0; i < 60; i++) {
    const req = new Request(origin + "/api/" + path, {
      headers: { "x-forwarded-for": "192.0.2." + i },
    });
    expect(
      (await GET(req, { params: Promise.resolve({ route: path.split("/") }) }))
        .status,
    ).toBe(200);
  }
  vi.mocked(state.repo.listDirectory).mockClear();
  const blocked = await call("GET", path);
  expect(blocked.status).toBe(429);
  expect(Number(blocked.headers.get("retry-after"))).toBe(60);
  expect(blocked.headers.get("cache-control")).toBe("no-store");
  expect(state.repo.listDirectory).not.toHaveBeenCalled();
  await owner();
  expect((await call("GET", path)).status).toBe(200);
  state.cookie = "";
  vi.setSystemTime(Date.now() + 60000);
  expect((await call("GET", path)).status).toBe(200);
});

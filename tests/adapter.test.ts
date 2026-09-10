import { it, expect, vi, afterEach, beforeEach } from "vitest";
import { localRepository } from "@/lib/github/local";
import { githubRepository } from "@/lib/github/client";
import { clearReads } from "@/lib/github/read-cache";
vi.mock("server-only", () => ({}));
const api = vi.hoisted(() => ({
  getContent: vi.fn(),
  getTree: vi.fn(),
  createOrUpdateFileContents: vi.fn(),
  deleteFile: vi.fn(),
  listCommits: vi.fn(),
  paginate: vi.fn(),
}));
vi.mock("octokit", () => ({
  Octokit: class {
    rest = { repos: api, git: api };
    paginate = api.paginate;
  },
}));
let testClock = Date.UTC(2100, 0, 1);
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime((testClock += 3600001));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  clearReads();
});
it("refuses filesystem test adapter in production or when a real writer is configured", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("E2E_ADAPTER", "1");
  vi.stubEnv("E2E_SECRET", "test");
  expect(() => localRepository(true)).toThrow("隔离自动化测试");
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("GITHUB_WRITE_TOKEN", "not-a-real-token");
  expect(() => localRepository(true)).toThrow("隔离自动化测试");
});
it("uses the selected GitHub branch for reads and writes and clears cached reads after commit", async () => {
  vi.stubEnv("GITHUB_CONTENT_BRANCH", "learning-data");
  vi.stubEnv("GITHUB_WRITE_TOKEN", "not-a-real-token");
  api.getContent.mockResolvedValue({
    data: {
      content: Buffer.from("{}").toString("base64"),
      sha: "a".repeat(40),
    },
  });
  api.createOrUpdateFileContents.mockResolvedValue({
    data: { commit: { sha: "b".repeat(40) } },
  });
  const repo = githubRepository();
  await repo.getTextFile("data/progress.json");
  await repo.getTextFile("data/progress.json");
  expect(api.getContent).toHaveBeenCalledTimes(1);
  expect(api.getContent).toHaveBeenCalledWith(
    expect.objectContaining({ ref: "learning-data", owner: "huayou712-maker" }),
  );
  await repo.updateTextFile(
    "data/progress.json",
    "a".repeat(40),
    "{}",
    "progress: test",
  );
  expect(api.createOrUpdateFileContents).toHaveBeenCalledWith(
    expect.objectContaining({ branch: "learning-data", sha: "a".repeat(40) }),
  );
  await repo.getTextFile("data/progress.json");
  expect(api.getContent).toHaveBeenCalledTimes(2);
});
it("translates GitHub SHA conflicts into a safe 409 error", async () => {
  vi.stubEnv("GITHUB_WRITE_TOKEN", "not-a-real-token");
  api.createOrUpdateFileContents.mockRejectedValue({ status: 409 });
  await expect(
    githubRepository().updateTextFile(
      "data/progress.json",
      "a".repeat(40),
      "{}",
      "test",
    ),
  ).rejects.toMatchObject({ status: 409 });
});
it("fetches one cached history page, not an unbounded pagination chain", async () => {
  vi.stubEnv("GITHUB_CONTENT_BRANCH", "learning-data");
  api.listCommits.mockResolvedValue({
    data: [
      {
        sha: "a".repeat(40),
        commit: { message: "test", committer: { date: "2099-01-01" } },
        html_url: "#",
      },
    ],
  });
  const repo = githubRepository();
  await Promise.all(
    Array.from({ length: 10 }, () =>
      repo.getCommitsForPath("content/notes/a.md"),
    ),
  );
  expect(api.listCommits).toHaveBeenCalledTimes(1);
  expect(api.listCommits).toHaveBeenCalledWith(
    expect.objectContaining({ sha: "learning-data", per_page: 30, page: 1 }),
  );
  await repo.getCommitsForPath("content/notes/a.md", 2);
  expect(api.listCommits).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 2, per_page: 30 }),
  );
  expect(api.paginate).not.toHaveBeenCalled();
  for (const page of [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER])
    await expect(
      repo.getCommitsForPath("content/notes/a.md", page),
    ).rejects.toMatchObject({ status: 400 });
  expect(api.listCommits).toHaveBeenCalledTimes(2);
});
it("charges history cache misses across repository instances and does not reset the budget when caches clear", async () => {
  vi.stubEnv("GITHUB_WRITE_TOKEN", "synthetic");
  api.listCommits.mockResolvedValue({ data: [] });
  api.getContent.mockResolvedValue({
    data: {
      sha: "a".repeat(40),
      content: Buffer.from("test").toString("base64"),
    },
  });
  for (let page = 1; page <= 59; page++)
    await githubRepository().getCommitsForPath("content/notes/a.md", page);
  const repo = githubRepository();
  await repo.getTextFileAtRef("content/notes/a.md", "a".repeat(40));
  await repo.getTextFileAtRef("content/notes/a.md", "a".repeat(40));
  expect(api.getContent).toHaveBeenCalledTimes(1);
  await repo.getCommitsForPath("content/notes/a.md", 1);
  clearReads();
  await expect(
    repo.getCommitsForPath("content/notes/a.md", 61),
  ).rejects.toMatchObject({ status: 429 });
  await expect(
    repo.getTextFileAtRef("content/notes/a.md", "b".repeat(40)),
  ).rejects.toMatchObject({ status: 429 });
  expect(api.listCommits).toHaveBeenCalledTimes(59);
  expect(api.getContent).toHaveBeenCalledTimes(1);
  vi.setSystemTime(Date.now() + 60000);
  await expect(
    repo.getCommitsForPath("content/notes/a.md", 61),
  ).resolves.toEqual([]);
});
it("caps sustained history reads per hour including failed upstream attempts", async () => {
  vi.stubEnv("GITHUB_WRITE_TOKEN", "");
  api.listCommits.mockRejectedValue({ status: 503 });
  for (let batch = 0; batch < 2; batch++) {
    for (let i = 0; i < 25; i++)
      await expect(
        githubRepository().getCommitsForPath("content/notes/a.md"),
      ).rejects.toMatchObject({ status: 503 });
    vi.setSystemTime(Date.now() + 60000);
  }
  await expect(
    githubRepository().getCommitsForPath("content/notes/a.md"),
  ).rejects.toMatchObject({ status: 429 });
  expect(api.listCommits).toHaveBeenCalledTimes(50);
});

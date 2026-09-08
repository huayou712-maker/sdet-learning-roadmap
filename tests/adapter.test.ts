import { it, expect, vi, afterEach } from "vitest";
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
afterEach(() => {
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

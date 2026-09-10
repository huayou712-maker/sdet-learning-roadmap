// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import {
  verifyAttemptCI,
  workflowDeclaration,
} from "@/lib/training/ci-verification";
import { trainingActions } from "@/lib/github/training-actions";
import {
  practiceAttempt,
  verificationReader,
  workflowText,
  runMetadata,
  jobMetadata,
} from "./helpers/verification-fixture";
const api = vi.hoisted(() => ({
  options: null as unknown,
  run: vi.fn(),
  jobs: vi.fn(),
  artifacts: vi.fn(),
  content: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("octokit", () => ({
  Octokit: class {
    constructor(options: unknown) {
      api.options = options;
    }
    rest = {
      actions: {
        getWorkflowRun: api.run,
        listJobsForWorkflowRunAttempt: api.jobs,
        listWorkflowRunArtifacts: api.artifacts,
      },
      repos: { getContent: api.content },
    };
  },
}));
afterEach(() => vi.clearAllMocks());
it.each([
  "",
  "https://evil.test/actions/runs/123",
  "https://github.com/other/repo/actions/runs/123",
  "https://github.com/huayou712-maker/sdet-learning-roadmap/actions/runs/9007199254740992",
])(
  "rejects unbounded or foreign CI inputs before network: %s",
  async (ciUrl) => {
    const reader = verificationReader();
    await expect(
      verifyAttemptCI(practiceAttempt({ ciUrl }), reader),
    ).rejects.toMatchObject({ status: 400 });
    expect(reader.getRun).not.toHaveBeenCalled();
  },
);
it.each(["source", "commit", "workflow"])(
  "stops after run metadata on a %s mismatch",
  async (field) => {
    const reader = verificationReader(),
      run = runMetadata();
    if (field === "source") run.head_repository.full_name = "foreign/fork";
    if (field === "commit") run.head_sha = "b".repeat(40);
    if (field === "workflow") run.path = ".github/workflows/other.yml";
    reader.getRun.mockResolvedValue(run);
    const result = await verifyAttemptCI(practiceAttempt(), reader);
    expect(
      result[
        field === "source"
          ? "sourceMatches"
          : field === "commit"
            ? "commitMatches"
            : "workflowMatches"
      ],
    ).toBe(false);
    expect(result.reportContentVerified).toBe(false);
    expect(result.artifact).toBe("not_checked");
    expect(reader.getJobs).not.toHaveBeenCalled();
    expect(reader.getWorkflow).not.toHaveBeenCalled();
  },
);
it("bounds a matching run to four reads and pins jobs to the observed rerun", async () => {
  const reader = verificationReader(),
    input = practiceAttempt(),
    original = structuredClone(input);
  const result = await verifyAttemptCI(input, reader);
  expect(result).toMatchObject({
    level: "metadata_only",
    runAttempt: 2,
    status: "success",
    declaration: "demonstration",
    artifact: "present",
    reportContentVerified: false,
  });
  expect(reader.getJobs).toHaveBeenCalledExactlyOnceWith(123, 2);
  expect(reader.getWorkflow).toHaveBeenCalledExactlyOnceWith(input.commitSha);
  expect(reader.getRun).toHaveBeenCalledTimes(1);
  expect(reader.getArtifacts).toHaveBeenCalledTimes(1);
  expect(input).toEqual(original);
});
it("rejects wrong run IDs, wrong job attempt and inconsistent totals", async () => {
  const reader = verificationReader();
  reader.getRun.mockResolvedValue({ ...runMetadata(), id: 124 });
  await expect(
    verifyAttemptCI(practiceAttempt(), reader),
  ).rejects.toMatchObject({ status: 503 });
  reader.getRun.mockResolvedValue(runMetadata());
  const jobs = jobMetadata();
  jobs.jobs[0].run_attempt = 1;
  reader.getJobs.mockResolvedValue(jobs);
  await expect(
    verifyAttemptCI(practiceAttempt(), reader),
  ).rejects.toMatchObject({ status: 503 });
  reader.getJobs.mockResolvedValue({ ...jobMetadata(), total_count: 0 });
  await expect(
    verifyAttemptCI(practiceAttempt(), reader),
  ).rejects.toMatchObject({ status: 503 });
});
it("reports expired/missing/truncated artifact lists without claiming validation", async () => {
  const reader = verificationReader();
  reader.getArtifacts.mockResolvedValue({
    total_count: 21,
    artifacts: [{ id: 789, name: "beginner-lab-junit", expired: true }],
  });
  expect(await verifyAttemptCI(practiceAttempt(), reader)).toMatchObject({
    artifact: "expired",
    artifactsTruncated: true,
    reportContentVerified: false,
  });
  reader.getArtifacts.mockResolvedValue({ total_count: 0, artifacts: [] });
  reader.getJobs.mockResolvedValue({ total_count: 21, jobs: [] });
  expect(await verifyAttemptCI(practiceAttempt(), reader)).toMatchObject({
    artifact: "missing",
    jobsTruncated: true,
    jobStatus: "unknown",
  });
  reader.getRun.mockResolvedValue({
    ...runMetadata(),
    conclusion: "__proto__",
  });
  expect((await verifyAttemptCI(practiceAttempt(), reader)).status).toBe(
    "unknown",
  );
});
it("recognizes only bounded literal configuration declarations, never runtime proof", () => {
  expect(workflowDeclaration(workflowText())).toBe("demonstration");
  expect(
    workflowDeclaration(
      workflowText("python selfcheck.py tests/test_registration_practice.py"),
    ),
  ).toBe("personal");
  expect(workflowDeclaration(workflowText("echo python selfcheck.py"))).toBe(
    "other",
  );
  expect(
    workflowDeclaration(
      workflowText("python selfcheck.py").replace(
        "projects/beginner-api-lab",
        "other",
      ),
    ),
  ).toBe("unknown");
  for (const text of [
    null,
    "x".repeat(32769),
    "a: &a [*a]",
    "!!js/function >\n  function() { globalThis.pwned = true; }",
    "a: 1\na: 2",
    "[",
  ])
    expect(workflowDeclaration(text)).toBe("unknown");
  expect(globalThis).not.toHaveProperty("pwned");
});
it.each([401, 403, 404, 429, 500])(
  "sanitizes remote failure %s without retry",
  async (status) => {
    const reader = verificationReader();
    reader.getRun.mockRejectedValue(
      Object.assign(new Error("RAW_REMOTE_DETAIL"), { status }),
    );
    await expect(
      verifyAttemptCI(practiceAttempt(), reader),
    ).rejects.toMatchObject({ status: status === 404 ? 404 : 503 });
    await expect(
      verifyAttemptCI(practiceAttempt(), reader),
    ).rejects.not.toThrow("RAW_REMOTE_DETAIL");
    expect(reader.getJobs).not.toHaveBeenCalled();
  },
);
it("uses fixed unauthenticated GET endpoints, bounded pages, no retries and a ten-second limit", async () => {
  api.run.mockResolvedValue({ data: runMetadata() });
  api.jobs.mockResolvedValue({ data: jobMetadata() });
  api.artifacts.mockResolvedValue({ data: { total_count: 0, artifacts: [] } });
  api.content.mockResolvedValue({
    data: {
      content: Buffer.from(workflowText()).toString("base64"),
      size: workflowText().length,
      encoding: "base64",
    },
  });
  const reader = trainingActions();
  await reader.getRun(123);
  await reader.getJobs(123, 2);
  await reader.getArtifacts(123);
  await reader.getWorkflow("a".repeat(40));
  expect(api.options).toMatchObject({
    request: { timeout: 10000 },
    retry: { enabled: false },
    throttle: { enabled: false },
  });
  expect(api.options).not.toHaveProperty("auth");
  expect(api.jobs).toHaveBeenCalledExactlyOnceWith({
    owner: "huayou712-maker",
    repo: "sdet-learning-roadmap",
    run_id: 123,
    attempt_number: 2,
    page: 1,
    per_page: 20,
  });
  expect(api.content).toHaveBeenCalledExactlyOnceWith({
    owner: "huayou712-maker",
    repo: "sdet-learning-roadmap",
    path: ".github/workflows/python-lab.yml",
    ref: "a".repeat(40),
  });
  api.content.mockRejectedValue({ status: 404 });
  expect(await reader.getWorkflow("a".repeat(40))).toBeNull();
  api.content.mockResolvedValue({
    data: { content: "", size: 32769, encoding: "base64" },
  });
  await expect(reader.getWorkflow("a".repeat(40))).rejects.toMatchObject({
    status: 503,
  });
});

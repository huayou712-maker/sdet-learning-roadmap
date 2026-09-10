import { vi } from "vitest";
import type { Attempt } from "@/lib/training/schema";
export const practiceAttempt = (changes: Partial<Attempt> = {}): Attempt => ({
  id: "77777777-7777-4777-8777-777777777777",
  commitSha: "a".repeat(40),
  normal: "passed",
  faults: { age: "missed", duplicate: "detected", status: "not_run" },
  reflection: "合成练习记录，只用于隔离测试，不表示实际成绩。",
  ciUrl:
    "https://github.com/huayou712-maker/sdet-learning-roadmap/actions/runs/123",
  recordedAt: "2026-09-10T00:00:00Z",
  provenance: "self_reported",
  ...changes,
});
export const workflowText = (command = "python selfcheck.py") =>
  "jobs:\n  registration-lab:\n    defaults:\n      run:\n        working-directory: projects/beginner-api-lab\n    steps:\n      - run: " +
  command +
  "\n";
export const runMetadata = () => ({
  id: 123,
  head_sha: "a".repeat(40),
  path: ".github/workflows/python-lab.yml",
  run_attempt: 2,
  status: "completed",
  conclusion: "success",
  repository: { full_name: "huayou712-maker/sdet-learning-roadmap" },
  head_repository: { full_name: "huayou712-maker/sdet-learning-roadmap" },
});
export const jobMetadata = () => ({
  total_count: 1,
  jobs: [
    {
      id: 456,
      run_id: 123,
      run_attempt: 2,
      name: "registration-lab",
      status: "completed",
      conclusion: "success",
      steps: [],
    },
  ],
});
export const verificationReader = () => ({
  getRun: vi.fn(async () => runMetadata()),
  getJobs: vi.fn(async () => jobMetadata()),
  getArtifacts: vi.fn(async () => ({
    total_count: 1,
    artifacts: [{ id: 789, name: "beginner-lab-junit", expired: false }],
  })),
  getWorkflow: vi.fn(async () => workflowText()),
});

// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { readTraining, saveTraining } from "@/lib/training/service";
import {
  emptyTraining,
  MAX_STATE_BYTES,
  TEST_PATH,
  TRAINING_PATH,
} from "@/lib/training/schema";
import { trainingRepo } from "./helpers/training-repo";
vi.mock("server-only", () => ({}));
let memory: ReturnType<typeof trainingRepo>;
const input = () => ({
  action: "attempt",
  sha: null,
  acknowledgedPublic: true,
  attempt: {
    id: crypto.randomUUID(),
    commitSha: "a".repeat(40),
    normal: "passed",
    faults: { age: "detected", duplicate: "missed", status: "not_run" },
    reflection: "重复注册后还需要检查原始数据是否被覆盖。",
    ciUrl: "",
  },
});
beforeEach(() => {
  memory = trainingRepo();
  memory.versions.set(TEST_PATH + ":" + "a".repeat(40), {
    path: TEST_PATH,
    content: "def test_registration(): pass",
    sha: "b".repeat(40),
  });
});
it("reads an absent archive without creating data", async () => {
  expect(await readTraining(memory.repo)).toEqual({
    state: emptyTraining(),
    sha: null,
  });
  expect(memory.repo.createTextFile).not.toHaveBeenCalled();
});
it("records self-reported results, exact code version and only the training file", async () => {
  memory.put("data/progress.json", "unchanged");
  const result = await saveTraining(memory.repo, input());
  expect(result.state.attempts[0]).toMatchObject({
    provenance: "self_reported",
    faults: { duplicate: "missed" },
  });
  expect(result.commit).toMatch(/^[a-f0-9]{40}$/);
  expect(memory.repo.getTextFileAtRef).toHaveBeenCalledWith(
    TEST_PATH,
    "a".repeat(40),
  );
  expect([...memory.files.keys()]).toEqual([
    "data/progress.json",
    TRAINING_PATH,
  ]);
  expect(memory.files.get("data/progress.json")?.content).toBe("unchanged");
});
it("rejects stale SHA and duplicate request IDs without overwriting", async () => {
  const value = input();
  const result = await saveTraining(memory.repo, value);
  const before = memory.files.get(TRAINING_PATH)?.content;
  await expect(saveTraining(memory.repo, input())).rejects.toMatchObject({
    status: 409,
  });
  await expect(
    saveTraining(memory.repo, { ...value, sha: result.sha }),
  ).rejects.toMatchObject({ status: 409 });
  expect(memory.files.get(TRAINING_PATH)?.content).toBe(before);
});
it("requires a real independent test file at the submitted commit", async () => {
  memory.versions.clear();
  await expect(saveTraining(memory.repo, input())).rejects.toMatchObject({
    status: 400,
  });
  expect(memory.repo.createTextFile).not.toHaveBeenCalled();
});
it.each(["provenance", "recordedAt", "testPath"])(
  "rejects client-controlled %s",
  async (field) => {
    const value = input();
    await expect(
      saveTraining(memory.repo, {
        ...value,
        attempt: { ...value.attempt, [field]: "forged" },
      }),
    ).rejects.toThrow();
    expect(memory.repo.createTextFile).not.toHaveBeenCalled();
  },
);
it.each([
  "https://evil.test/a",
  "https://github.com/other/repo/actions/runs/1",
  "javascript:alert(1)",
  "https://github.com/huayou712-maker/sdet-learning-roadmap/actions/runs/1?token=x",
])("rejects unsafe CI URL %s", async (ciUrl) => {
  const value = input();
  value.attempt.ciUrl = ciUrl;
  await expect(saveTraining(memory.repo, value)).rejects.toThrow();
});
it("accepts a same-repository CI link without fetching or claiming verification", async () => {
  const value = input();
  value.attempt.ciUrl =
    "https://github.com/huayou712-maker/sdet-learning-roadmap/actions/runs/123";
  expect(
    (await saveTraining(memory.repo, value)).state.attempts[0].provenance,
  ).toBe("self_reported");
});
it("rejects credentials and does not expose them in errors", async () => {
  const value = input();
  value.attempt.reflection = "token ghp_" + "x".repeat(36);
  await expect(saveTraining(memory.repo, value)).rejects.toMatchObject({
    status: 400,
  });
  expect(memory.repo.createTextFile).not.toHaveBeenCalled();
});
it("does not count environmental failure as fault detection", async () => {
  const value = input();
  value.attempt.normal = "failed";
  await expect(saveTraining(memory.repo, value)).rejects.toThrow();
});
it("requires public acknowledgement and all three results", async () => {
  const value = input();
  await expect(
    saveTraining(memory.repo, { ...value, acknowledgedPublic: false }),
  ).rejects.toThrow();
  await expect(
    saveTraining(memory.repo, {
      ...value,
      attempt: { ...value.attempt, faults: {} },
    }),
  ).rejects.toThrow();
});
it.each([
  "{broken",
  JSON.stringify({ version: 42, attempts: [] }),
  " ".repeat(MAX_STATE_BYTES + 1),
])("never silently resets invalid or oversized archives", async (text) => {
  memory.put(TRAINING_PATH, text);
  await expect(readTraining(memory.repo)).rejects.toMatchObject({
    status: 503,
  });
  expect(memory.repo.updateTextFile).not.toHaveBeenCalled();
});
it("stops at the attempt limit without trimming history", async () => {
  const record = (await saveTraining(memory.repo, input())).state.attempts[0];
  memory.put(
    TRAINING_PATH,
    JSON.stringify({
      version: 1,
      attempts: Array.from({ length: 100 }, () => ({
        ...record,
        id: crypto.randomUUID(),
      })),
    }),
  );
  const { sha } = await readTraining(memory.repo);
  await expect(
    saveTraining(memory.repo, { ...input(), sha }),
  ).rejects.toMatchObject({ status: 409 });
  expect((await readTraining(memory.repo)).state.attempts).toHaveLength(100);
});
it("rejects duplicate IDs in an externally damaged archive rather than resetting it", async () => {
  const result = await saveTraining(memory.repo, input());
  memory.put(
    TRAINING_PATH,
    JSON.stringify({
      ...result.state,
      attempts: [result.state.attempts[0], result.state.attempts[0]],
    }),
  );
  await expect(readTraining(memory.repo)).rejects.toMatchObject({
    status: 503,
  });
  expect(memory.repo.updateTextFile).not.toHaveBeenCalled();
});

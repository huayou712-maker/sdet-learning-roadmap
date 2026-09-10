// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { readTraining, saveTraining } from "@/lib/training/service";
import {
  nextReview,
  dueReviews,
  recommendTraining,
} from "@/lib/training/rules";
import {
  emptyTraining,
  TRAINING_PATH,
  type Grade,
  type TrainingState,
} from "@/lib/training/schema";
import { saveNote, entries, trashEntry } from "@/lib/content/service";
import { trainingRepo } from "./helpers/training-repo";
import roadmap from "../data/roadmap.json";
vi.mock("server-only", () => ({}));
let memory: ReturnType<typeof trainingRepo>;
let sourceId: string;
const now = new Date("2026-09-10T23:59:59.000Z");
beforeEach(async () => {
  memory = trainingRepo();
  sourceId = (
    await saveNote(memory.repo, {
      title: "边界断言",
      stageId: "stage-01",
      body: "示范合成笔记",
      acknowledgedPublic: true,
    })
  ).id;
});
async function create(kind = "concept") {
  return saveTraining(
    memory.repo,
    {
      action: "createReview",
      sha: (await readTraining(memory.repo)).sha,
      acknowledgedPublic: true,
      review: {
        sourceId,
        question: "为什么只判断 200 不足够？",
        answer: "还要核对响应体与数据状态。",
        kind,
      },
    },
    now,
  );
}
async function grade(
  id: string,
  rating: Grade = "independent",
  date = now,
  evidence = "",
) {
  return saveTraining(
    memory.repo,
    {
      action: "gradeReview",
      sha: (await readTraining(memory.repo)).sha,
      acknowledgedPublic: true,
      id,
      grade: rating,
      response: "我认为必须同时检查数据的变化。",
      evidence,
    },
    date,
  );
}
it.each([
  [0, "independent", "2026-09-13", 1],
  [1, "independent", "2026-09-17", 2],
  [2, "independent", "2026-09-24", 3],
  [3, "independent", "2026-10-10", 4],
  [4, "hint", "2026-09-13", 0],
  [4, "again", "2026-09-11", 0],
] as const)(
  "schedules streak %s / %s in UTC",
  (streak, rating, due, nextStreak) => {
    expect(nextReview(streak, rating, now)).toMatchObject({
      due,
      streak: nextStreak,
    });
  },
);
it("handles year rollover using UTC", () => {
  expect(
    nextReview(0, "again", new Date("2026-12-31T23:30:00-06:00")).due,
  ).toBe("2027-01-02");
});
it("creates from a live note, preserves source and rejects duplicates", async () => {
  const before = await entries(memory.repo);
  const result = await create();
  expect(result.state.reviews[0]).toMatchObject({
    sourceId,
    due: "2026-09-10",
    streak: 0,
    history: [],
    sourceSha: before[0].sha,
  });
  expect(await entries(memory.repo)).toEqual(before);
  await expect(create()).rejects.toMatchObject({ status: 409 });
});
it("does not create from a missing or deleted source", async () => {
  const source = (await entries(memory.repo))[0];
  await trashEntry(memory.repo, source.id, source.sha, "delete");
  await expect(create()).rejects.toMatchObject({ status: 400 });
  sourceId = "missing";
  await expect(create()).rejects.toMatchObject({ status: 404 });
});
it("stores responses and history and disallows early or double grading", async () => {
  const card = (await create()).state.reviews[0];
  const result = await grade(card.id);
  expect(result.state.reviews[0].history[0]).toMatchObject({
    grade: "independent",
    nextDue: "2026-09-13",
  });
  await expect(grade(card.id)).rejects.toMatchObject({ status: 409 });
  await expect(
    grade(card.id, "independent", new Date("2026-09-12T12:00:00Z")),
  ).rejects.toMatchObject({ status: 409 });
  const next = await grade(card.id, "again", new Date("2026-09-13T12:00:00Z"));
  expect(next.state.reviews[0]).toMatchObject({ streak: 0, due: "2026-09-14" });
  expect(next.state.reviews[0].history).toHaveLength(2);
});
it("requires redo evidence for code questions", async () => {
  const card = (await create("code")).state.reviews[0];
  await expect(grade(card.id)).rejects.toMatchObject({ status: 400 });
  expect(
    (
      await grade(
        card.id,
        "hint",
        now,
        "pytest -q，漏检重复注册，仍需补充断言。",
      )
    ).state.reviews[0].history,
  ).toHaveLength(1);
});
it("suspends and resumes without losing history", async () => {
  const result = await create();
  const card = result.state.reviews[0];
  const suspended = await saveTraining(
    memory.repo,
    {
      action: "suspendReview",
      sha: result.sha,
      acknowledgedPublic: true,
      id: card.id,
      suspended: true,
    },
    now,
  );
  await expect(grade(card.id)).rejects.toMatchObject({ status: 409 });
  const resumed = await saveTraining(
    memory.repo,
    {
      action: "suspendReview",
      sha: suspended.sha,
      acknowledgedPublic: true,
      id: card.id,
      suspended: false,
    },
    now,
  );
  expect(resumed.state.reviews[0]).toEqual(card);
});
it("disallows deleted-source grading and excludes it from the queue", async () => {
  const result = await create();
  const source = (await entries(memory.repo))[0];
  await trashEntry(memory.repo, source.id, source.sha, "delete");
  await expect(grade(result.state.reviews[0].id)).rejects.toMatchObject({
    status: 409,
  });
  expect(
    dueReviews(result.state, await entries(memory.repo), "2026-09-11"),
  ).toEqual([]);
});
it("blocks credentials in review responses", async () => {
  const card = (await create()).state.reviews[0];
  await expect(
    grade(card.id, "independent", now, "ghp_" + "x".repeat(36)),
  ).rejects.toMatchObject({ status: 400 });
});
it("enforces review and history limits without trimming", async () => {
  const result = await create();
  const card = result.state.reviews[0];
  memory.put(
    TRAINING_PATH,
    JSON.stringify({
      ...result.state,
      reviews: Array.from({ length: 100 }, (_, i) => ({
        ...card,
        id: crypto.randomUUID(),
        sourceId: "source-" + i,
      })),
    }),
  );
  await expect(create()).rejects.toMatchObject({ status: 409 });
  card.history = Array.from({ length: 60 }, () => ({
    ratedAt: "2026-01-01T00:00:00.000Z",
    grade: "again",
    response: "未掌握",
    evidence: "",
    nextDue: "2026-01-02",
  }));
  memory.put(
    TRAINING_PATH,
    JSON.stringify({ ...result.state, reviews: [card] }),
  );
  await expect(grade(card.id)).rejects.toMatchObject({ status: 409 });
  expect(
    (await readTraining(memory.repo)).state.reviews[0].history,
  ).toHaveLength(60);
});
const progress = { version: 1, updatedAt: null, items: {} };
it("prioritizes due reviews, latest misses, mainline within budget without mutation", async () => {
  const state = (await create()).state;
  state.attempts.push({
    id: crypto.randomUUID(),
    commitSha: "a".repeat(40),
    ciUrl: "",
    provenance: "self_reported",
    recordedAt: now.toISOString(),
    normal: "passed",
    faults: { age: "detected", duplicate: "missed", status: "detected" },
    reflection: "duplicate regression",
  });
  const before = structuredClone({ state, progress });
  const plan = recommendTraining(
    state,
    await entries(memory.repo),
    roadmap,
    progress,
    "2026-09-10",
    60,
  );
  expect(plan.map((r) => r.id)).toEqual([
    state.reviews[0].id,
    "duplicate",
    roadmap.beginnerPath[0].id,
  ]);
  expect(plan.map((r) => r.minutes)).toEqual([10, 30, 20]);
  expect({ state, progress }).toEqual(before);
  state.attempts.push({
    ...state.attempts[0],
    id: crypto.randomUUID(),
    faults: { age: "detected", duplicate: "detected", status: "detected" },
  });
  expect(
    recommendTraining(state, [], roadmap, progress, "2026-09-10", 60).some(
      (r) => r.id === "duplicate",
    ),
  ).toBe(false);
});
it("explains failed baseline and handles zero or invalid budgets", () => {
  const state: TrainingState = {
    ...emptyTraining(),
    attempts: [
      {
        id: crypto.randomUUID(),
        commitSha: "a".repeat(40),
        ciUrl: "",
        provenance: "self_reported",
        recordedAt: now.toISOString(),
        normal: "failed",
        faults: { age: "not_run", duplicate: "not_run", status: "not_run" },
        reflection: "环境失败，需要重新验证",
      },
    ],
  };
  expect(
    recommendTraining(state, [], roadmap, progress, "2026-09-10", 20)[0],
  ).toMatchObject({ id: "normal", minutes: 20 });
  expect(
    recommendTraining(state, [], roadmap, progress, "2026-09-10", 0),
  ).toEqual([]);
  expect(
    recommendTraining(state, [], roadmap, progress, "2026-09-10", NaN),
  ).toEqual([]);
});
it("sorts overdue cards and excludes future or suspended cards", async () => {
  const state = (await create()).state;
  const base = state.reviews[0];
  state.reviews = [
    { ...base, id: crypto.randomUUID(), due: "2026-09-11" },
    { ...base, id: crypto.randomUUID(), suspended: true },
    { ...base, id: crypto.randomUUID(), due: "2026-09-09" },
    base,
  ];
  expect(
    dueReviews(state, await entries(memory.repo), "2026-09-10").map(
      (c) => c.due,
    ),
  ).toEqual(["2026-09-09", "2026-09-10"]);
});

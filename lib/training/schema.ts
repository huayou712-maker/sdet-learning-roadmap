import { z } from "zod";

export const TRAINING_PATH = "content/training/state.json";
export const TEST_PATH =
  "projects/beginner-api-lab/tests/test_registration_practice.py";
export const REPOSITORY_URL =
  "https://github.com/huayou712-maker/sdet-learning-roadmap";
export const MAX_STATE_BYTES = 512 * 1024;
export const faults = [
  {
    id: "age",
    title: "错误接受 17 岁",
    suggestion: "补充年龄边界的状态码、响应与数据状态断言。",
  },
  {
    id: "duplicate",
    title: "错误允许重复注册",
    suggestion: "补充重复注册后的记录数量与原记录不被覆盖的断言。",
  },
  {
    id: "status",
    title: "错误返回 200",
    suggestion: "明确断言契约规定的状态码，不只检查 response.ok。",
  },
] as const;
export const resultLabels = {
  detected: "检出",
  missed: "漏检",
  not_run: "未验证",
} as const;
const faultResult = z.enum(["detected", "missed", "not_run"]);
const sha = z.string().regex(/^[a-f0-9]{40}$/);
export const attemptInput = z
  .object({
    id: z.uuid(),
    commitSha: sha,
    normal: z.enum(["passed", "failed", "not_run"]),
    faults: z
      .object({ age: faultResult, duplicate: faultResult, status: faultResult })
      .strict(),
    reflection: z.string().trim().min(10).max(2000),
    ciUrl: z.union([
      z.literal(""),
      z
        .string()
        .regex(
          /^https:\/\/github\.com\/huayou712-maker\/sdet-learning-roadmap\/actions\/runs\/[1-9][0-9]*$/,
        ),
    ]),
  })
  .strict()
  .refine(
    (value) =>
      value.normal === "passed" ||
      Object.values(value.faults).every((r) => r !== "detected"),
    { message: "正常实现通过后才能将故障标记为检出" },
  );
export const attemptSchema = attemptInput.safeExtend({
  recordedAt: z.iso.datetime(),
  provenance: z.literal("self_reported"),
});
export const trainingSchema = z
  .object({
    version: z.literal(1),
    attempts: z.array(attemptSchema).max(100),
  })
  .strict();
export const reviewInput = z
  .object({
    sourceId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,100}$/),
    kind: z.enum(["concept", "code"]),
    question: z.string().trim().min(5).max(300),
    answer: z.string().trim().min(5).max(2000),
  })
  .strict();
export const gradeSchema = z.enum(["independent", "hint", "again"]);
export type Grade = z.infer<typeof gradeSchema>;
export const gradeLabels: Record<Grade, string> = {
  independent: "独立答对",
  hint: "需要提示",
  again: "仍然不会",
};
export const reviewEventSchema = z
  .object({
    ratedAt: z.iso.datetime(),
    grade: gradeSchema,
    response: z.string().trim().min(1).max(2000),
    evidence: z.string().max(2000),
    nextDue: z.iso.date(),
  })
  .strict();
export const reviewSchema = reviewInput
  .extend({
    id: z.uuid(),
    createdAt: z.iso.datetime(),
    sourceType: z.enum(["note", "debug"]),
    sourceTitle: z.string().max(160),
    sourceSha: sha,
    due: z.iso.date(),
    suspended: z.boolean(),
    streak: z.number().int().min(0).max(60),
    history: z.array(reviewEventSchema).max(60),
  })
  .strict();
export const stateSchema = trainingSchema
  .extend({
    reviews: z.array(reviewSchema).max(100).default([]),
  })
  .superRefine((state, context) => {
    for (const values of [
      state.attempts.map((a) => a.id),
      state.reviews.map((r) => r.id),
      state.reviews.map((r) => r.sourceId),
    ]) {
      if (new Set(values).size !== values.length)
        context.addIssue({
          code: "custom",
          message: "训练档案包含重复标识，请先核对原文件。",
        });
    }
  });
const common = {
  sha: sha.nullable(),
  acknowledgedPublic: z.literal(true),
};
export const mutationSchema = z.discriminatedUnion("action", [
  z
    .object({ ...common, action: z.literal("attempt"), attempt: attemptInput })
    .strict(),
  z
    .object({
      ...common,
      action: z.literal("createReview"),
      review: reviewInput,
    })
    .strict(),
  z
    .object({
      ...common,
      action: z.literal("gradeReview"),
      id: z.uuid(),
      grade: gradeSchema,
      response: z.string().trim().min(1).max(2000),
      evidence: z.string().trim().max(2000),
    })
    .strict(),
  z
    .object({
      ...common,
      action: z.literal("suspendReview"),
      id: z.uuid(),
      suspended: z.boolean(),
    })
    .strict(),
]);
export type Attempt = z.infer<typeof attemptSchema>;
export type TrainingState = z.infer<typeof stateSchema>;
export type TrainingSnapshot = { state: TrainingState; sha: string | null };
export type TrainingMutation = z.infer<typeof mutationSchema>;
export type TrainingCommand = TrainingMutation extends infer T
  ? T extends TrainingMutation
    ? Omit<T, "sha" | "acknowledgedPublic">
    : never
  : never;
export type Review = z.infer<typeof reviewSchema>;
export function emptyTraining(): TrainingState {
  return { version: 1, attempts: [], reviews: [] };
}

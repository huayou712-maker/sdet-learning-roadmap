import { z } from "zod";
export const ciStatusLabels: Record<string, string> = {
  success: "成功",
  failure: "失败",
  cancelled: "已取消",
  skipped: "已跳过",
  timed_out: "超时",
  action_required: "需要处理",
  neutral: "中性结果",
  queued: "排队中",
  in_progress: "运行中",
  completed: "已结束",
  waiting: "等待中",
  pending: "待处理",
  requested: "已请求",
  stale: "已失效",
};
export const ciVerificationSchema = z
  .object({
    level: z.literal("metadata_only"),
    checkedAt: z.iso.datetime(),
    runId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    runAttempt: z.number().int().min(1).max(1000),
    runUrl: z
      .string()
      .regex(
        /^https:\/\/github\.com\/huayou712-maker\/sdet-learning-roadmap\/actions\/runs\/[1-9][0-9]*$/,
      ),
    commitMatches: z.boolean(),
    workflowMatches: z.boolean(),
    sourceMatches: z.boolean(),
    status: z.string().max(40),
    declaration: z.enum(["personal", "demonstration", "other", "unknown"]),
    jobStatus: z.string().max(40),
    jobsTruncated: z.boolean(),
    artifact: z.enum(["present", "expired", "missing", "not_checked"]),
    artifactsTruncated: z.boolean(),
    reportContentVerified: z.literal(false),
  })
  .strict();
export type CIVerification = z.infer<typeof ciVerificationSchema>;
export type WorkflowDeclaration = CIVerification["declaration"];

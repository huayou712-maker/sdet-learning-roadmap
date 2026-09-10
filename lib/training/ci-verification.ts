import { z } from "zod";
import { parseDocument } from "yaml";
import { AppError } from "@/lib/errors";
import { type Attempt, REPOSITORY_URL } from "./schema";
import {
  ciStatusLabels,
  type CIVerification,
  type WorkflowDeclaration,
} from "./ci-model";

export const CI_WORKFLOW = ".github/workflows/python-lab.yml";
export const CI_REPOSITORY = "huayou712-maker/sdet-learning-roadmap";
const integer = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const runSchema = z.object({
  id: integer,
  head_sha: sha,
  path: z.string().max(240),
  run_attempt: integer.max(1000),
  status: z.string().max(40),
  conclusion: z.string().max(40).nullable(),
  repository: z.object({ full_name: z.string().max(200) }),
  head_repository: z.object({ full_name: z.string().max(200) }).nullable(),
});
const jobsSchema = z.object({
  total_count: z.number().int().nonnegative(),
  jobs: z
    .array(
      z.object({
        id: integer,
        run_id: integer,
        run_attempt: integer,
        name: z.string().max(200),
        status: z.string().max(40),
        conclusion: z.string().max(40).nullable(),
        steps: z
          .array(
            z.object({
              name: z.string().max(500),
              status: z.string().max(40),
              conclusion: z.string().max(40).nullable(),
            }),
          )
          .max(50)
          .optional(),
      }),
    )
    .max(20),
});
const artifactsSchema = z.object({
  total_count: z.number().int().nonnegative(),
  artifacts: z
    .array(
      z.object({
        id: integer,
        name: z.string().max(200),
        expired: z.boolean(),
      }),
    )
    .max(20),
});
export interface ActionsReader {
  getRun(id: number): Promise<unknown>;
  getJobs(id: number, attempt: number): Promise<unknown>;
  getArtifacts(id: number): Promise<unknown>;
  getWorkflow(sha: string): Promise<string | null>;
}
export function workflowDeclaration(text: string | null): WorkflowDeclaration {
  if (!text || new TextEncoder().encode(text).length > 32768) return "unknown";
  try {
    const document = parseDocument(text, {
      schema: "core",
      customTags: [],
      stringKeys: true,
      uniqueKeys: true,
      prettyErrors: false,
    });
    if (document.errors.length || document.warnings.length) return "unknown";
    const data = document.toJS({ maxAliasCount: 0 });
    const config = z
      .object({
        jobs: z.object({
          "registration-lab": z.object({
            defaults: z.object({
              run: z.object({
                "working-directory": z.literal("projects/beginner-api-lab"),
              }),
            }),
            steps: z
              .array(z.object({ run: z.string().max(5000).optional() }))
              .max(50),
          }),
        }),
      })
      .safeParse(data);
    if (!config.success) return "unknown";
    const lines = config.data.jobs["registration-lab"].steps.flatMap((step) =>
      (step.run || "").split(/\r?\n/).map((line) => line.trim()),
    );
    if (
      lines.some((line) =>
        /^python(?:3)? selfcheck\.py tests\/test_registration_practice\.py$/.test(
          line,
        ),
      )
    )
      return "personal";
    if (lines.some((line) => /^python(?:3)? selfcheck\.py$/.test(line)))
      return "demonstration";
    return "other";
  } catch {
    return "unknown";
  }
}
const safeStatus = (status: string | null) =>
  status && Object.hasOwn(ciStatusLabels, status) ? status : "unknown";
export async function verifyAttemptCI(
  attempt: Attempt,
  reader: ActionsReader,
  now = new Date(),
): Promise<CIVerification> {
  const match =
    /^https:\/\/github\.com\/huayou712-maker\/sdet-learning-roadmap\/actions\/runs\/([1-9][0-9]*)$/.exec(
      attempt.ciUrl,
    );
  const runId = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(runId))
    throw new AppError(400, "请先为这次练习保存有效的本仓库 CI 运行链接。");
  try {
    const run = runSchema.parse(await reader.getRun(runId));
    if (run.id !== runId)
      throw new AppError(503, "CI 返回的运行标识不一致，未继续核对。");
    const result: CIVerification = {
      level: "metadata_only",
      checkedAt: now.toISOString(),
      runId,
      runAttempt: run.run_attempt,
      runUrl: REPOSITORY_URL + "/actions/runs/" + runId,
      sourceMatches:
        run.repository.full_name === CI_REPOSITORY &&
        run.head_repository?.full_name === CI_REPOSITORY,
      commitMatches: run.head_sha === attempt.commitSha,
      workflowMatches: run.path === CI_WORKFLOW,
      status: safeStatus(run.conclusion || run.status),
      declaration: "unknown",
      jobStatus: "unknown",
      jobsTruncated: false,
      artifact: "not_checked",
      artifactsTruncated: false,
      reportContentVerified: false,
    };
    if (
      !result.sourceMatches ||
      !result.commitMatches ||
      !result.workflowMatches
    )
      return result;
    const [jobsRaw, artifactsRaw, workflow] = await Promise.all([
      reader.getJobs(runId, run.run_attempt),
      reader.getArtifacts(runId),
      reader.getWorkflow(attempt.commitSha),
    ]);
    const jobs = jobsSchema.parse(jobsRaw);
    const artifacts = artifactsSchema.parse(artifactsRaw);
    if (
      jobs.jobs.some(
        (job) => job.run_id !== runId || job.run_attempt !== run.run_attempt,
      )
    )
      throw new AppError(503, "作业不属于本次运行或重跑轮次，未采信。");
    if (
      jobs.total_count < jobs.jobs.length ||
      artifacts.total_count < artifacts.artifacts.length
    )
      throw new AppError(503, "CI 列表计数不一致，未采信。");
    result.jobsTruncated = jobs.total_count > jobs.jobs.length;
    result.artifactsTruncated =
      artifacts.total_count > artifacts.artifacts.length;
    const job = jobs.jobs.find((job) => job.name === "registration-lab");
    result.jobStatus = job
      ? safeStatus(job.conclusion || job.status)
      : "unknown";
    result.declaration = workflowDeclaration(workflow);
    const reports = artifacts.artifacts.filter(
      (artifact) => artifact.name === "beginner-lab-junit",
    );
    result.artifact = reports.some((report) => !report.expired)
      ? "present"
      : reports.length
        ? "expired"
        : "missing";
    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    const status = (error as { status?: number }).status;
    if (status === 404)
      throw new AppError(404, "CI 运行或所需元数据不存在，可能已删除。");
    if (status === 401 || status === 403 || status === 429)
      throw new AppError(
        503,
        "GitHub 公开 API 权限或配额不足，请稍后手动重试。",
      );
    throw new AppError(
      503,
      "CI 元数据读取超时、不完整或超过安全范围，未得出验收结论。",
    );
  }
}

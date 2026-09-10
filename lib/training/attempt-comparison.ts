import { z } from "zod";
import { recordInput } from "@/lib/schemas/content";
import { assertNoCredentials } from "@/lib/security/credentials";
import { literalBlock } from "./case-design";
import { faults, resultLabels, REPOSITORY_URL, type Attempt } from "./schema";

export const normalLabels = {
  passed: "通过",
  failed: "失败／环境阻塞",
  not_run: "未验证",
} as const;
export const comparisonFields = {
  phenomenon: "现象",
  context: "上下文",
  hypothesis: "初始假设",
  investigation: "排查过程",
  cause: "根因",
  fix: "修复方案",
  validation: "验证结果",
  prevention: "预防方式",
} as const;
const text = z.string().max(2000);
const pairSchema = z
  .object({
    beforeId: z.uuid(),
    beforeSha: z.string().regex(/^[a-f0-9]{40}$/),
    afterId: z.uuid(),
    afterSha: z.string().regex(/^[a-f0-9]{40}$/),
  })
  .strict();
export const comparisonDraftSchema = z
  .object({
    pair: pairSchema.nullable(),
    title: z.string().max(160),
    category: z.string().max(32),
    fields: z
      .object({
        phenomenon: text,
        context: text,
        hypothesis: text,
        investigation: text,
        cause: text,
        fix: text,
        validation: text,
        prevention: text,
      })
      .strict(),
  })
  .strict();
export type ComparisonDraft = z.infer<typeof comparisonDraftSchema>;
export function blankComparison(): ComparisonDraft {
  return {
    pair: null,
    title: "",
    category: "",
    fields: {
      phenomenon: "",
      context: "",
      hypothesis: "",
      investigation: "",
      cause: "",
      fix: "",
      validation: "",
      prevention: "",
    },
  };
}
export function attemptPair(
  attempts: Attempt[],
  beforeId: string,
  afterId: string,
) {
  const earlier = attempts.findIndex((a) => a.id === beforeId);
  const later = attempts.findIndex((a) => a.id === afterId);
  if (earlier < 0 || later <= earlier) return null;
  const before = attempts[earlier],
    after = attempts[later];
  if (Date.parse(before.recordedAt) > Date.parse(after.recordedAt)) return null;
  return { before, after };
}
export function boundPair(attempts: Attempt[], value: ComparisonDraft) {
  if (!value.pair) return null;
  const selected = attemptPair(
    attempts,
    value.pair.beforeId,
    value.pair.afterId,
  );
  if (
    !selected ||
    selected.before.commitSha !== value.pair.beforeSha ||
    selected.after.commitSha !== value.pair.afterSha
  )
    return null;
  return selected;
}
export function prepareComparison(
  before: Attempt,
  after: Attempt,
): ComparisonDraft {
  return {
    ...blankComparison(),
    title: "注册练习：两次尝试的排障复盘",
    pair: {
      beforeId: before.id,
      beforeSha: before.commitSha,
      afterId: after.id,
      afterSha: after.commitSha,
    },
  };
}
export function comparisonRows(before: Attempt, after: Attempt) {
  return [
    {
      label: "正常实现",
      before: normalLabels[before.normal],
      after: normalLabels[after.normal],
    },
    ...faults.map((f) => ({
      label: f.title,
      before: resultLabels[before.faults[f.id]],
      after: resultLabels[after.faults[f.id]],
    })),
  ].map((row) => ({ ...row, changed: row.before !== row.after }));
}
export function comparisonMarkdown(
  value: ComparisonDraft,
  attempts: Attempt[],
) {
  const draft = comparisonDraftSchema.parse(value),
    selected = boundPair(attempts, draft);
  if (!selected) throw new Error("对照来源已失效，请重新选择尝试。");
  assertNoCredentials(draft);
  const { before, after } = selected;
  return [
    ...Object.entries(comparisonFields).flatMap(([key, label]) => [
      "## " + label,
      literalBlock(
        draft.fields[key as keyof typeof comparisonFields] ||
          "待补充，尚未得出结论。",
      ),
      ...(key === "validation"
        ? [
            "**两次尝试的自报变化**",
            "以下来自 GitHub 训练档案，结果为学习者自报；不证明修复因果、独立完成或能力掌握。",
            ...comparisonRows(before, after).map(
              (row) => "- " + row.label + "：" + row.before + " → " + row.after,
            ),
            "较早记录：" + before.recordedAt + " / " + before.id,
            REPOSITORY_URL + "/commit/" + before.commitSha,
            "较晚记录：" + after.recordedAt + " / " + after.id,
            REPOSITORY_URL + "/commit/" + after.commitSha,
            "代码差异：" +
              REPOSITORY_URL +
              "/compare/" +
              before.commitSha +
              "..." +
              after.commitSha,
            "较早 CI（未自动核验）：" + (before.ciUrl || "未提供"),
            "较晚 CI（未自动核验）：" + (after.ciUrl || "未提供"),
          ]
        : []),
    ]),
  ].join("\n\n");
}
export function comparisonRecord(
  value: ComparisonDraft,
  attempts: Attempt[],
  project: { id: string; stageId: string },
  categories: string[],
  acknowledgedPublic: boolean,
) {
  const draft = comparisonDraftSchema.parse(value);
  if (draft.category && !categories.includes(draft.category))
    throw new Error("分类标签已不可用。");
  if (
    !draft.fields.phenomenon.trim() ||
    !draft.fields.investigation.trim() ||
    !draft.fields.validation.trim()
  )
    throw new Error("请填写现象、排查过程和验证结果。");
  return recordInput.parse({
    title: draft.title.trim(),
    stageId: project.stageId,
    projectId: project.id,
    body: comparisonMarkdown(draft, attempts),
    tags: draft.category ? [draft.category] : [],
    topicIds: [],
    status: "in_progress",
    showInPortfolio: false,
    acknowledgedPublic,
  });
}

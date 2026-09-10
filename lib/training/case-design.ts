import { z } from "zod";
import { assertNoCredentials } from "@/lib/security/credentials";
import { recordInput } from "@/lib/schemas/content";
import { REPOSITORY_URL } from "./schema";

export const contractUrl =
  REPOSITORY_URL +
  "/blob/e70b92e205d390339c0d1f836a91858647551b9b/projects/beginner-api-lab/README.md";
export const caseCategories = {
  normal: "正常注册与查询",
  age: "年龄边界与类型",
  username: "用户名边界",
  protocol: "字段与请求格式",
  duplicate: "重复注册",
  isolation: "失败后的数据隔离",
} as const;
export const caseHints: Record<keyof typeof caseCategories, string> = {
  normal:
    "注册后的 GET 是否包含刚创建的用户？状态码、关键字段与持久状态是否分别断言？",
  age: "核对 17 / 18 / 120 / 121，并考虑布尔值、字符串、小数和 null。失败后是否检查 users 未增加？",
  username:
    "核对长度 2 / 3 / 20 / 21、允许字符及大小写。不要让年龄错误掩盖用户名校验。",
  protocol:
    "区分缺字段、多字段、非对象 JSON、错误 JSON 和 Content-Type；根据契约校验顺序分别设计。",
  duplicate:
    "先创建，再用相同 username 请求。检查原记录内容与总数，不能只判断响应未成功。",
  isolation:
    "失败注册之后执行 GET。每条测试使用独立实例，单独运行与整组运行都应可重复。",
};
export const caseFields = {
  name: "用例名称",
  preconditions: "前置条件",
  input: "输入与步骤",
  status: "预期状态码",
  response: "预期响应",
  data: "预期数据变化",
  reason: "设计理由",
} as const;
export const caseRowSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,50}$/),
    category: z.enum([
      "normal",
      "age",
      "username",
      "protocol",
      "duplicate",
      "isolation",
    ]),
    name: z.string().max(120),
    preconditions: z.string().max(500),
    input: z.string().max(500),
    status: z.string().regex(/^[0-9]{0,3}$/),
    response: z.string().max(500),
    data: z.string().max(500),
    reason: z.string().max(500),
    consulted: z.boolean(),
  })
  .strict();
export const caseDesignSchema = z
  .object({
    title: z.string().max(160),
    cases: z.array(caseRowSchema).min(1).max(20),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.cases.map((row) => row.id)).size === value.cases.length,
    "用例标识重复",
  );
export type CaseRow = z.infer<typeof caseRowSchema>;
export type CaseDesign = z.infer<typeof caseDesignSchema>;
export function blankCase(id: string): CaseRow {
  return {
    id,
    category: "normal",
    name: "",
    preconditions: "",
    input: "",
    status: "",
    response: "",
    data: "",
    reason: "",
    consulted: false,
  };
}
export function caseIssues(row: CaseRow) {
  return Object.entries(caseFields).flatMap(([key, label]) => {
    const value = row[key as keyof typeof caseFields];
    return !value.trim() || (key === "status" && !/^[1-5][0-9]{2}$/.test(value))
      ? [label]
      : [];
  });
}
export function literalBlock(text: string) {
  const longest = Math.max(
    2,
    ...(text.match(/`+/g) || []).map((part) => part.length),
  );
  const fence = "`".repeat(longest + 1);
  return fence + "text\n" + text.trim() + "\n" + fence;
}
export function designMarkdown(value: CaseDesign) {
  const design = caseDesignSchema.parse(value);
  assertNoCredentials(design);
  return [
    "## 作业要求",
    "依据注册接口 HTTP 契约 v1，独立设计输入、预期和断言。",
    contractUrl,
    "## 完成内容",
    "以下为学习者填写的测试设计，不代表已执行、检出故障或通过能力验收。",
    ...design.cases.flatMap((row, i) => [
      "### 用例 " + (i + 1) + " · " + caseCategories[row.category],
      "检查提示：" +
        (row.consulted ? "填写后已查看，可据此修订" : "未在设计台展开"),
      ...Object.entries(caseFields).flatMap(([key, label]) => [
        "#### " + label,
        literalBlock(row[key as keyof typeof caseFields]),
      ]),
    ]),
    "## 自我验收",
    "字段完整性仅检查是否填写；实际预期须按契约核对。后续使用自己的测试和 CI 证据验收。",
    "## 运行方式",
    "尚未记录运行；在独立练习后补充实际命令、版本和结果。",
  ].join("\n\n");
}
export function designAssignment(
  value: CaseDesign,
  project: { id: string; stageId: string },
  acknowledgedPublic: boolean,
) {
  const design = caseDesignSchema.parse(value);
  if (design.cases.some((row) => caseIssues(row).length))
    throw new Error("请补齐每条用例的必填字段和三位状态码。");
  return recordInput.parse({
    title: design.title.trim(),
    stageId: project.stageId,
    assignmentId: project.id,
    body: designMarkdown(design),
    tags: ["用例设计", "注册接口"],
    topicIds: [],
    status: "submitted",
    showInPortfolio: false,
    acknowledgedPublic,
  });
}

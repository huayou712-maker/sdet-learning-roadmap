import { randomUUID } from "node:crypto";
import { recordInput, metaSchema, type Kind } from "@/lib/schemas/content";
import type { Repository } from "@/lib/github/types";
import type { ProjectDefinition } from "./catalog";
import { entries, findEntry } from "./service";
import { serializeEntry } from "./format";
import { AppError } from "@/lib/errors";
import { slug, safePath } from "@/lib/github/paths";
import { assertNoCredentials } from "@/lib/security/credentials";
import { projectChecks } from "./project-checks";
export async function validateTopics(
  repo: Repository,
  stageId: string,
  topicIds: string[],
) {
  const r = await repo.getTextFile("data/roadmap.json");
  if (!r) throw new AppError(503, "学习路线未初始化");
  const roadmap = JSON.parse(r.content) as {
    stages: { id: string; groups: { items: { id: string }[] }[] }[];
  };
  const stage = roadmap.stages.find((s) => s.id === stageId);
  if (
    !stage ||
    topicIds.some(
      (id) => !stage.groups.some((g) => g.items.some((i) => i.id === id)),
    )
  )
    throw new AppError(400, "关联知识点不属于所选阶段");
}
export async function saveRecord(
  repo: Repository,
  kind: Exclude<Kind, "note">,
  payload: unknown,
  id?: string,
) {
  const input = recordInput.parse(payload);
  assertNoCredentials(input);
  await validateTopics(repo, input.stageId, input.topicIds);
  const old = id ? await findEntry(repo, id) : null;
  if (old && (old.type !== kind || old.deletedAt))
    throw new AppError(400, "记录类型不匹配或已删除");
  if (old && !input.sha) throw new AppError(400, "缺少文件版本");
  const now = new Date().toISOString();
  const { body, sha, acknowledgedPublic, ...fields } = input;
  void acknowledgedPublic;
  let entityId = old?.id || randomUUID();
  let path = old?.path || "";
  let iteration = old?.iteration;
  let projectNo = input.projectNo;
  if (kind === "assignment") {
    if (!input.assignmentId) throw new AppError(400, "请选择作业");
    const defs = await repo.getTextFile("data/projects.json");
    const definitions = JSON.parse(
      defs?.content || "[]",
    ) as ProjectDefinition[];
    if (
      !definitions.some(
        (p) => p.id === input.assignmentId && p.stageId === input.stageId,
      )
    )
      throw new AppError(400, "作业与阶段不匹配");
    if (!old)
      iteration =
        (await entries(repo)).filter(
          (e) =>
            e.type === "assignment" && e.assignmentId === input.assignmentId,
        ).length + 1;
    else if (old.assignmentId !== input.assignmentId)
      throw new AppError(400, "不能更改历史提交所属作业");
    path =
      old?.path ||
      "content/assignments/" + input.assignmentId + "/" + entityId + ".md";
  }
  if (kind === "daily") {
    if (!input.date) throw new AppError(400, "请选择有效日期");
    if (old && old.date !== input.date)
      throw new AppError(400, "日课日期不可更改");
    entityId = old?.id || "daily-" + input.date;
    path =
      "content/daily/" +
      input.date.slice(0, 4) +
      "/" +
      input.date.slice(5, 7) +
      "/" +
      input.date +
      ".md";
  }
  if (kind === "project") {
    if (projectNo === undefined) throw new AppError(400, "项目编号无效");
    const defs = await repo.getTextFile("data/projects.json");
    const definition = (
      JSON.parse(defs?.content || "[]") as ProjectDefinition[]
    ).find((p) => p.projectNo === projectNo);
    if (
      !definition ||
      definition.stageId !== input.stageId ||
      input.checklist.length !==
        projectChecks(definition, old?.checklist).length ||
      input.checklist.some(
        (c, i) =>
          c.title !== projectChecks(definition, old?.checklist)[i]?.title,
      )
    )
      throw new AppError(400, "项目验收清单与路线定义不一致");
    if (old && old.projectNo !== projectNo)
      throw new AppError(400, "项目编号不可更改");
    entityId = definition.id;
    path = "content/project-submissions/" + entityId + ".md";
    projectNo = definition.projectNo;
    if (input.repositoryPath) {
      safePath(input.repositoryPath);
      if (!input.repositoryPath.startsWith("projects/"))
        throw new AppError(400, "代码路径应位于 projects/");
    }
  }
  if (kind === "debug" && input.projectId) {
    const defs = await repo.getTextFile("data/projects.json");
    if (
      !(JSON.parse(defs?.content || "[]") as ProjectDefinition[]).some(
        (p) => p.id === input.projectId,
      )
    )
      throw new AppError(400, "关联项目不存在");
  }
  if (kind === "debug")
    path =
      old?.path ||
      "content/debug-journal/" +
        now.slice(0, 10) +
        "-" +
        slug(input.title) +
        "-" +
        entityId +
        ".md";
  const meta = metaSchema.parse({
    ...fields,
    id: entityId,
    type: kind,
    projectNo,
    iteration,
    createdAt: old?.createdAt || now,
    updatedAt: now,
    deletedAt: null,
    startedAt: old?.startedAt || now,
    submittedAt: kind === "assignment" ? now : null,
    completedAt: input.status === "completed" ? old?.completedAt || now : null,
  });
  const content = serializeEntry(meta, body);
  const message =
    kind +
    "(" +
    input.stageId +
    "): " +
    (old ? "update " : "add ") +
    input.title +
    (iteration ? " v" + iteration : "");
  const commit = old
    ? await repo.updateTextFile(path, sha!, content, message)
    : await repo.createTextFile(path, content, message);
  return { id: entityId, commit };
}

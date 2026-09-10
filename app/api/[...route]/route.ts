import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { identity, testMode } from "@/lib/auth/session";
import { assertOwner, isOwner } from "@/lib/github/authz";
import { repository } from "@/lib/github/contents";
import {
  entries,
  findEntry,
  saveNote,
  trashEntry,
} from "@/lib/content/service";
import { saveRecord, validateTopics } from "@/lib/content/learning-service";
import { parseEntry } from "@/lib/content/format";
import { readLearning } from "@/lib/content/read";
import { progressInput, noteInput, type Kind } from "@/lib/schemas/content";
import { AppError } from "@/lib/errors";
import { jsonBody, sameOrigin, errorResponse } from "@/lib/http";
import { searchIndex } from "@/lib/search";
import { buildTimeline } from "@/lib/content/timeline";
import { HISTORY_PAGE_SIZE, historyPage } from "@/lib/github/history-policy";
import { consumeAnonymousHistoryRequest } from "@/lib/security/read-budget";
type Context = { params: Promise<{ route: string[] }> };
const kinds: Record<string, Kind> = {
  notes: "note",
  assignments: "assignment",
  projects: "project",
  "debug-journal": "debug",
  daily: "daily",
};
export const dynamic = "force-dynamic";
export async function GET(req: Request, context: Context) {
  try {
    const segments = (await context.params).route;
    if (segments.length > 3) throw new AppError(404, "接口不存在");
    const [kind, id, sub] = segments;
    const repo = repository();
    const owner = isOwner(await identity());
    const query = new URL(req.url).searchParams;
    let page = 1;
    const ref = query.get("ref");
    if (kinds[kind] && id && sub === "history") {
      if (!owner) consumeAnonymousHistoryRequest();
      page = historyPage(query.get("page"));
      if (ref !== null && !/^[a-f0-9]{40}$/.test(ref))
        throw new AppError(400, "版本号格式错误");
    }
    if (kind === "roadmap")
      return NextResponse.json((await readLearning()).roadmap);
    if (kind === "progress") return NextResponse.json(await readLearning());
    if (kind === "search")
      return NextResponse.json(
        searchIndex(
          await entries(repo),
          (await readLearning()).roadmap,
          query.get("q") || "",
          owner,
        ),
      );
    if (kind === "timeline")
      return NextResponse.json(await buildTimeline(repo, owner));
    if (kinds[kind]) {
      if (!id)
        return NextResponse.json(
          (await entries(repo)).filter(
            (e) =>
              e.type === kinds[kind] &&
              !e.deletedAt &&
              (owner || e.showInPortfolio),
          ),
        );
      const e = await findEntry(repo, id);
      if (
        e.type !== kinds[kind] ||
        (!owner && (e.deletedAt || !e.showInPortfolio))
      )
        throw new AppError(404, "找不到学习记录");
      if (sub === "history") {
        const commits = await repo.getCommitsForPath(e.path, page);
        if (ref) {
          if (!commits.some((commit) => commit.sha === ref))
            throw new AppError(
              404,
              "版本不在此记录的当前历史页中，请刷新历史列表",
            );
          const file = await repo.getTextFileAtRef(e.path, ref);
          if (!file) throw new AppError(404, "找不到版本");
          const past = parseEntry(file.path, file.content, file.sha);
          if (
            past.id !== e.id ||
            past.type !== e.type ||
            (!owner && (!past.showInPortfolio || past.deletedAt))
          )
            throw new AppError(404, "该版本未公开展示");
          return NextResponse.json(past);
        }
        return NextResponse.json(
          owner
            ? commits
            : commits.map((c) => ({ ...c, message: "公开记录历史版本" })),
          {
            headers:
              commits.length === HISTORY_PAGE_SIZE
                ? { "X-History-Next-Page": String(page + 1) }
                : undefined,
          },
        );
      }
      if (sub) throw new AppError(404, "接口不存在");
      return NextResponse.json(e);
    }
    throw new AppError(404, "接口不存在");
  } catch (e) {
    return errorResponse(e);
  }
}
async function mutate(req: Request, context: Context) {
  try {
    const segments = (await context.params).route;
    if (segments.length > 3) throw new AppError(404, "接口不存在");
    const [kind, id, sub] = segments;
    sameOrigin(req);
    if (kind === "test-session") {
      if (
        !testMode() ||
        req.headers.get("x-e2e-secret") !== process.env.E2E_SECRET
      )
        throw new AppError(404, "接口不存在");
      const response = NextResponse.json({ ok: true });
      response.cookies.set("e2e-owner", process.env.E2E_SECRET!, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      });
      return response;
    }
    assertOwner(await identity());
    const repo = repository();
    const payload = await jsonBody(req);
    let result: unknown;
    if (
      kinds[kind] &&
      !sub &&
      ((req.method === "POST" && !id) || (req.method === "PUT" && id))
    ) {
      if (kind === "notes") {
        const parsed = noteInput.parse(payload);
        await validateTopics(repo, parsed.stageId, parsed.topicIds);
        result = await saveNote(repo, payload, id);
      } else
        result = await saveRecord(
          repo,
          kinds[kind] as Exclude<Kind, "note">,
          payload,
          id,
        );
    } else if (kinds[kind] && id && !sub && req.method === "DELETE") {
      if (payload.acknowledgedPublic !== true)
        throw new AppError(400, "请确认公开仓库提示");
      const found = await findEntry(repo, id);
      if (found.type !== kinds[kind]) throw new AppError(400, "记录类型不匹配");
      result = await trashEntry(repo, id, payload.sha, "delete");
    } else if (
      kind === "trash" &&
      id &&
      ["restore", "permanent"].includes(sub) &&
      req.method === "POST"
    ) {
      if (payload.acknowledgedPublic !== true)
        throw new AppError(400, "请确认公开仓库提示");
      result = await trashEntry(
        repo,
        id,
        payload.sha,
        sub as "restore" | "permanent",
      );
    } else if (kind === "progress" && id && !sub && req.method === "PATCH") {
      const input = progressInput.parse(payload);
      const { roadmap, progress } = await readLearning();
      const stage = roadmap.stages.find((s) =>
        s.groups.some((g) => g.items.some((i) => i.id === id)),
      );
      if (!stage) throw new AppError(400, "知识点不存在");
      if (input.evidence) {
        const records = await entries(repo);
        for (const e of input.evidence) {
          if (e.type === "commit") {
            if (!/^[a-f0-9]{40}$/.test(e.id))
              throw new AppError(400, "Commit 证据需完整 SHA");
            const exists = await repo.getTextFileAtRef(
              "data/progress.json",
              e.id,
            );
            if (!exists) throw new AppError(400, "Commit 不属于可验证学习历史");
          } else if (
            !records.some(
              (r) => r.id === e.id && r.type === e.type && !r.deletedAt,
            )
          )
            throw new AppError(400, "证据不存在或已删除");
        }
      }
      progress.items[id] = {
        completed: input.completed,
        completedAt: input.completed
          ? progress.items[id]?.completedAt || new Date().toISOString()
          : null,
        evidence: input.evidence ?? progress.items[id]?.evidence ?? [],
      };
      progress.updatedAt = new Date().toISOString();
      const commit = await repo.updateTextFile(
        "data/progress.json",
        input.sha,
        JSON.stringify(progress, null, 2) + "\n",
        "progress(" +
          stage.id +
          "): " +
          (input.completed ? "complete " : "reopen ") +
          stage.groups.flatMap((g) => g.items).find((i) => i.id === id)!.title,
      );
      const file = await repo.getTextFile("data/progress.json");
      if (!file)
        throw new AppError(503, "提交已完成，但读取最新版本失败，请刷新");
      result = { commit, progress: JSON.parse(file.content), sha: file.sha };
    } else throw new AppError(405, "不支持此操作");
    revalidatePath("/", "layout");
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
export const POST = mutate;
export const PUT = mutate;
export const PATCH = mutate;
export const DELETE = mutate;

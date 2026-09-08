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
import { parseEntry } from "@/lib/content/format";
import { readLearning } from "@/lib/content/read";
import { progressInput } from "@/lib/schemas/content";
import { AppError } from "@/lib/errors";
import { jsonBody, sameOrigin, errorResponse } from "@/lib/http";
type Context = { params: Promise<{ route: string[] }> };
export const dynamic = "force-dynamic";
export async function GET(req: Request, context: Context) {
  try {
    const [kind, id, sub] = (await context.params).route;
    const repo = repository();
    const owner = isOwner(await identity());
    if (kind === "roadmap")
      return NextResponse.json((await readLearning()).roadmap);
    if (kind === "progress") return NextResponse.json(await readLearning());
    if (kind === "notes") {
      if (!id)
        return NextResponse.json(
          (await entries(repo)).filter(
            (e) => !e.deletedAt && (owner || e.showInPortfolio),
          ),
        );
      const e = await findEntry(repo, id);
      if (!owner && (e.deletedAt || !e.showInPortfolio))
        throw new AppError(404, "找不到学习记录");
      if (sub === "history") {
        const ref = new URL(req.url).searchParams.get("ref");
        if (ref) {
          const file = await repo.getTextFileAtRef(e.path, ref);
          if (!file) throw new AppError(404, "找不到版本");
          const past = parseEntry(file.path, file.content, file.sha);
          if (!owner && (!past.showInPortfolio || past.deletedAt))
            throw new AppError(404, "该版本未公开展示");
          return NextResponse.json(past);
        }
        return NextResponse.json(await repo.getCommitsForPath(e.path));
      }
      return NextResponse.json(e);
    }
    throw new AppError(404, "接口不存在");
  } catch (e) {
    return errorResponse(e);
  }
}
async function mutate(req: Request, context: Context) {
  try {
    const [kind, id, sub] = (await context.params).route;
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
    if (kind === "notes" && req.method === "POST" && !id)
      result = await saveNote(repo, payload);
    else if (kind === "notes" && id && req.method === "PUT")
      result = await saveNote(repo, payload, id);
    else if (kind === "notes" && id && req.method === "DELETE") {
      if (payload.acknowledgedPublic !== true)
        throw new AppError(400, "请确认公开仓库提示");
      result = await trashEntry(repo, id, payload.sha, "delete");
    } else if (
      kind === "trash" &&
      id &&
      ["restore", "permanent"].includes(sub)
    ) {
      if (payload.acknowledgedPublic !== true)
        throw new AppError(400, "请确认公开仓库提示");
      result = await trashEntry(
        repo,
        id,
        payload.sha,
        sub as "restore" | "permanent",
      );
    } else if (kind === "progress" && id && req.method === "PATCH") {
      const input = progressInput.parse(payload);
      const { roadmap, progress } = await readLearning();
      const stage = roadmap.stages.find((s) =>
        s.groups.some((g) => g.items.some((i) => i.id === id)),
      );
      if (!stage) throw new AppError(400, "知识点不存在");
      progress.items[id] = {
        completed: input.completed,
        completedAt: input.completed ? new Date().toISOString() : null,
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
          id,
      );
      const file = await repo.getTextFile("data/progress.json");
      result = { commit, progress, sha: file!.sha };
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

import { randomUUID } from "node:crypto";
import type { Repository } from "@/lib/github/types";
import { AppError } from "@/lib/errors";
import { slug } from "@/lib/github/paths";
import { idSchema, noteInput, type Entry } from "@/lib/schemas/content";
import { parseEntry, serializeEntry } from "./format";
export async function entries(repo: Repository) {
  const paths = (await repo.listDirectory("content/notes")).filter((p) =>
    p.endsWith(".md"),
  );
  const result: Entry[] = [];
  for (let i = 0; i < paths.length; i += 8) {
    const batch = await Promise.all(
      paths.slice(i, i + 8).map((p) => repo.getTextFile(p)),
    );
    for (const f of batch)
      if (f) result.push(parseEntry(f.path, f.content, f.sha));
  }
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function findEntry(repo: Repository, id: string) {
  idSchema.parse(id);
  const found = (await entries(repo)).find((n) => n.id === id);
  if (!found) throw new AppError(404, "找不到学习记录");
  return found;
}
export async function saveNote(
  repo: Repository,
  payload: unknown,
  id?: string,
) {
  const input = noteInput.parse(payload);
  const now = new Date().toISOString();
  const old = id ? await findEntry(repo, id) : null;
  if (old?.deletedAt) throw new AppError(400, "请先从回收站恢复记录");
  if (old && !input.sha) throw new AppError(400, "缺少文件版本");
  const { body, sha, acknowledgedPublic, ...fields } = input;
  void acknowledgedPublic;
  const meta = {
    ...fields,
    id: old?.id || randomUUID(),
    type: "note" as const,
    createdAt: old?.createdAt || now,
    updatedAt: now,
    deletedAt: null,
  };
  const path =
    old?.path ||
    "content/notes/" +
      input.stageId +
      "/" +
      now.slice(0, 10) +
      "-" +
      slug(input.title) +
      "-" +
      meta.id +
      ".md";
  const text = serializeEntry(meta, body);
  const message =
    "notes(" + input.stageId + "): " + (old ? "update " : "add ") + input.title;
  const commit = old
    ? await repo.updateTextFile(path, sha!, text, message)
    : await repo.createTextFile(path, text, message);
  return { id: meta.id, commit };
}
export async function trashEntry(
  repo: Repository,
  id: string,
  sha: string,
  action: "delete" | "restore" | "permanent",
) {
  const old = await findEntry(repo, id);
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new AppError(400, "缺少文件版本");
  if (action === "permanent") {
    if (!old.deletedAt) throw new AppError(400, "请先移入回收站");
    return {
      commit: await repo.deleteFile(
        old.path,
        sha,
        "content: permanently delete " + old.title,
      ),
    };
  }
  const { body, path, sha: oldSha, ...meta } = old;
  void oldSha;
  return {
    commit: await repo.updateTextFile(
      path,
      sha,
      serializeEntry(
        {
          ...meta,
          updatedAt: new Date().toISOString(),
          deletedAt: action === "restore" ? null : new Date().toISOString(),
        },
        body,
      ),
      "content: " +
        (action === "restore" ? "restore " : "move to trash ") +
        old.title,
    ),
  };
}

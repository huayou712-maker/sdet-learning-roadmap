import { it, expect } from "vitest";
import { saveNote, entries, trashEntry } from "@/lib/content/service";
import type { Repository, TextFile } from "@/lib/github/types";
import { createHash } from "node:crypto";
export function memoryRepo(): Repository {
  const files = new Map<string, TextFile>();
  const hash = (c: string) => createHash("sha1").update(c).digest("hex");
  return {
    getTextFile: async (p) => files.get(p) || null,
    listDirectory: async (p) =>
      [...files.keys()].filter((f) => f.startsWith(p + "/")),
    async createTextFile(p, c) {
      if (files.has(p)) throw new Error("conflict");
      files.set(p, { path: p, content: c, sha: hash(c) });
      return hash(c);
    },
    async updateTextFile(p, s, c) {
      if (files.get(p)?.sha !== s) throw new Error("conflict");
      files.set(p, { path: p, content: c, sha: hash(c) });
      return hash(c);
    },
    async deleteFile(p, s) {
      if (files.get(p)?.sha !== s) throw new Error("conflict");
      files.delete(p);
      return hash(p);
    },
    getCommitsForPath: async () => [],
    getTextFileAtRef: async () => null,
    createBinaryFile: async () => "",
  };
}
it("creates, edits, rejects stale SHA, soft deletes and restores", async () => {
  const repo = memoryRepo();
  const input = {
    title: "笔记",
    stageId: "stage-01",
    body: "我的理解",
    acknowledgedPublic: true,
  };
  const first = await saveNote(repo, input);
  let e = (await entries(repo))[0];
  await saveNote(repo, { ...input, body: "新版", sha: e.sha }, first.id);
  await expect(
    saveNote(repo, { ...input, sha: e.sha }, first.id),
  ).rejects.toThrow("conflict");
  e = (await entries(repo))[0];
  await trashEntry(repo, e.id, e.sha, "delete");
  e = (await entries(repo))[0];
  expect(e.deletedAt).toBeTruthy();
  await trashEntry(repo, e.id, e.sha, "restore");
  expect((await entries(repo))[0].deletedAt).toBeNull();
});

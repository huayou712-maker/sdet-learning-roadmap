import { createHash } from "node:crypto";
import { vi } from "vitest";
import { AppError } from "@/lib/errors";
import type { Repository, TextFile } from "@/lib/github/types";
export function trainingRepo() {
  const files = new Map<string, TextFile>();
  const versions = new Map<string, TextFile>();
  const put = (path: string, content: string) => {
    const sha = createHash("sha1").update(content).digest("hex");
    files.set(path, { path, content, sha });
    return sha;
  };
  const repo: Repository = {
    getTextFile: vi.fn(async (path) => files.get(path) || null),
    listDirectory: vi.fn(async (prefix) =>
      [...files.keys()].filter((p) => p.startsWith(prefix + "/")),
    ),
    createTextFile: vi.fn(async (path, content) => {
      if (files.has(path)) throw new AppError(409, "conflict");
      return put(path, content);
    }),
    updateTextFile: vi.fn(async (path, sha, content) => {
      if (files.get(path)?.sha !== sha) throw new AppError(409, "conflict");
      return put(path, content);
    }),
    deleteFile: vi.fn(async () => {
      throw new Error("deletion prohibited");
    }),
    getCommitsForPath: vi.fn(async () => []),
    getTextFileAtRef: vi.fn(
      async (path, ref) => versions.get(path + ":" + ref) || null,
    ),
    createBinaryFile: vi.fn(async () => {
      throw new Error("binary prohibited");
    }),
  };
  return { repo, files, versions, put };
}

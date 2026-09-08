import { readFile, readdir, writeFile, mkdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { AppError } from "@/lib/errors";
import { safePath, writablePath } from "./paths";
import type { Repository, CommitInfo } from "./types";
const sha = (s: string | Buffer) => createHash("sha1").update(s).digest("hex");
export function localRepository(writable = false): Repository {
  if(process.env.NODE_ENV==='production'||process.env.E2E_ADAPTER!=='1'||!process.env.E2E_SECRET||process.env.GITHUB_WRITE_TOKEN||!writable)throw new AppError(503,'本地适配器仅允许隔离自动化测试使用');
  if(!/^[a-z0-9-]+$/.test(process.env.E2E_RUN_ID||''))throw new AppError(503,'缺少隔离测试运行 ID');
  const root = join(process.cwd(), ".e2e-data",process.env.E2E_RUN_ID!);
  const historyRoot = join(root, ".history");
  async function get(path: string) {
    safePath(path);
    try {
      const content = await readFile(join(root, path), "utf8");
      return { path, content, sha: sha(content) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }
  async function history(path: string): Promise<CommitInfo[]> {
    try {
      return JSON.parse(
        await readFile(join(historyRoot, sha(path) + ".json"), "utf8"),
      );
    } catch {
      return [];
    }
  }
  async function put(
    path: string,
    content: Buffer | null,
    message: string,
    expected?: string,
  ) {
    if (!writable)
      throw new AppError(503, "当前是本地只读预览，请配置 GitHub 环境变量");
    writablePath(path);
    const old = await get(path);
    if (expected ? old?.sha !== expected : !!old)
      throw new AppError(
        409,
        "GitHub 中的文件已发生变化，请刷新最新版本后重新保存。",
      );
    const commit = sha(path + message + Date.now() + Math.random());
    await mkdir(dirname(join(root, path)), { recursive: true });
    await mkdir(historyRoot, { recursive: true });
    if (content) await writeFile(join(root, path), content);
    else await unlink(join(root, path));
    await writeFile(join(historyRoot, commit + ".txt"), content || "");
    await writeFile(
      join(historyRoot, sha(path) + ".json"),
      JSON.stringify([
        { sha: commit, message, date: new Date().toISOString(), url: "#" },
        ...(await history(path)),
      ]),
    );
    return commit;
  }
  return {
    getTextFile: get,
    async listDirectory(prefix) {
      safePath(prefix);
      const result: string[] = [];
      async function walk(p: string) {
        let files;
        try {
          files = await readdir(join(root, p), { withFileTypes: true });
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
          throw e;
        }
        for (const f of files) {
          const n = p + "/" + f.name;
          if (f.isDirectory()) await walk(n);
          else result.push(n);
        }
      }
      await walk(prefix);
      return result;
    },
    createTextFile: (p, c, m) => put(p, Buffer.from(c), m),
    createBinaryFile: (p, b, m) => put(p, b, m),
    updateTextFile: (p, s, c, m) => put(p, Buffer.from(c), m, s),
    deleteFile: (p, s, m) => put(p, null, m, s),
    getCommitsForPath: history,
    async getTextFileAtRef(path, ref) {
      if (
        !/^[a-f0-9]{40}$/.test(ref) ||
        !(await history(path)).some((c) => c.sha === ref)
      )
        throw new AppError(404, "找不到版本");
      const content = await readFile(join(historyRoot, ref + ".txt"), "utf8");
      return { path, content, sha: sha(content) };
    },
  };
}

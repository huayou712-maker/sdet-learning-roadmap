import "server-only";
import { Octokit } from "octokit";
import { AppError } from "@/lib/errors";
import { safePath, writablePath } from "./paths";
import type { Repository, TextFile } from "./types";
import { cachedRead, clearReads } from "./read-cache";
export function githubRepository(): Repository {
  const owner = process.env.GITHUB_OWNER || "huayou712-maker";
  const repo = process.env.GITHUB_REPO || "sdet-learning-roadmap";
  const branch = process.env.GITHUB_CONTENT_BRANCH || "main";
  if (owner !== "huayou712-maker" || repo !== "sdet-learning-roadmap")
    throw new AppError(
      503,
      "仓库配置必须指向 huayou712-maker/sdet-learning-roadmap",
    );
  const api = new Octokit({
    auth: process.env.GITHUB_WRITE_TOKEN || undefined,
    log: { debug() {}, info() {}, warn() {}, error() {} },
    request: { timeout: 15000 },
  });
  const write = () => {
    if (!process.env.GITHUB_WRITE_TOKEN)
      throw new AppError(503, "尚未配置服务器 GitHub 写入权限");
  };
  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 409 || status === 422) {
        clearReads();
        throw new AppError(
          409,
          "GitHub 中的文件已发生变化，请刷新最新版本后重新保存。",
        );
      }
      if (e instanceof AppError) throw e;
      if (status === 403 || status === 401)
        throw new AppError(503, "GitHub 仓库权限或 API 配额不足");
      throw new AppError(503, "GitHub API 暂时不可用，请稍后重试");
    }
  };
  async function get(path: string, ref = branch): Promise<TextFile | null> {
    safePath(path);
    return cachedRead(branch + ":file:" + ref + ":" + path, () =>
      wrap(async () => {
        try {
          const { data } = await api.rest.repos.getContent({
            owner,
            repo,
            path,
            ref,
          });
          if (Array.isArray(data) || !("content" in data))
            throw new AppError(400, "目标不是文本文件");
          return {
            path,
            sha: data.sha,
            content: Buffer.from(data.content, "base64").toString("utf8"),
          };
        } catch (e) {
          if ((e as { status?: number }).status === 404) return null;
          throw e;
        }
      }),
    );
  }
  return {
    getTextFile: get,
    async listDirectory(prefix) {
      safePath(prefix);
      return cachedRead(branch + ":tree:" + prefix, () =>
        wrap(async () => {
          const { data } = await api.rest.git.getTree({
            owner,
            repo,
            tree_sha: branch,
            recursive: "true",
          });
          if (data.truncated)
            throw new AppError(503, "仓库目录过大，无法完整读取");
          return data.tree
            .filter(
              (f) => f.type === "blob" && f.path?.startsWith(prefix + "/"),
            )
            .map((f) => f.path!);
        }),
      );
    },
    async createTextFile(path, content, message) {
      return this.createBinaryFile(path, Buffer.from(content), message);
    },
    async createBinaryFile(path, bytes, message) {
      write();
      writablePath(path);
      return wrap(async () => {
        const { data } = await api.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          branch,
          path,
          message,
          content: bytes.toString("base64"),
        });
        clearReads();
        return data.commit.sha!;
      });
    },
    async updateTextFile(path, sha, content, message) {
      write();
      writablePath(path);
      return wrap(async () => {
        const { data } = await api.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          branch,
          path,
          sha,
          message,
          content: Buffer.from(content).toString("base64"),
        });
        clearReads();
        return data.commit.sha!;
      });
    },
    async deleteFile(path, sha, message) {
      write();
      writablePath(path);
      return wrap(async () => {
        const { data } = await api.rest.repos.deleteFile({
          owner,
          repo,
          branch,
          path,
          sha,
          message,
        });
        clearReads();
        return data.commit.sha!;
      });
    },
    async getCommitsForPath(path) {
      safePath(path);
      return cachedRead(branch + ":history:" + path, () =>
        wrap(async () => {
          const commits = await api.paginate(api.rest.repos.listCommits, {
            owner,
            repo,
            path,
            sha: branch,
            per_page: 100,
          });
          return commits.map((c) => ({
            sha: c.sha,
            message: c.commit.message,
            date: c.commit.committer?.date || "",
            url: c.html_url,
          }));
        }),
      );
    },
    getTextFileAtRef(path, ref) {
      if (!/^[a-f0-9]{40}$/.test(ref))
        throw new AppError(400, "版本号格式错误");
      return get(path, ref);
    },
  };
}

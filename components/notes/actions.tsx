"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/components/ui/markdown";
import type { CommitInfo } from "@/lib/github/types";
export function ContentActions({
  id,
  sha,
  trashed = false,
}: {
  id: string;
  sha: string;
  trashed?: boolean;
}) {
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function run(action: string) {
    const response = await fetch(
      action === "delete"
        ? "/api/notes/" + id
        : "/api/trash/" + id + "/" + action,
      {
        method: action === "delete" ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha, acknowledgedPublic: true }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error);
      return;
    }
    setMessage("已保存 · Commit: " + data.commit.slice(0, 7));
    setConfirm("");
    router.refresh();
  }
  return (
    <div className="paper panel">
      <div className="actions">
        {(trashed ? ["restore", "permanent"] : ["delete"]).map((a) => (
          <button key={a} onClick={() => setConfirm(a)}>
            {a === "delete"
              ? "移入回收站"
              : a === "restore"
                ? "恢复记录"
                : "永久删除"}
          </button>
        ))}
      </div>
      {confirm && (
        <div role="alertdialog" aria-label="确认内容操作">
          <p>
            {confirm === "permanent"
              ? "即使永久删除当前文件，Git 历史仍可能保留旧版本。确定删除？"
              : confirm === "restore"
                ? "恢复此记录并提交到公开 GitHub 仓库？"
                : "将记录移入回收站？文件保留，可以恢复。此操作会提交到公开 GitHub 仓库。"}
          </p>
          <button
            onClick={() =>
              run(confirm).catch(() => setMessage("操作失败，请重试"))
            }
          >
            确认
          </button>{" "}
          <button onClick={() => setConfirm("")}>取消</button>
        </div>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
export function History({ id, kind = "notes" }: { id: string; kind?: string }) {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  async function load(ref?: string) {
    try {
      const r = await fetch(
        "/api/" + kind + "/" + id + "/history" + (ref ? "?ref=" + ref : ""),
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (ref) setBody(data.body);
      else setCommits(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }
  return (
    <section className="paper panel">
      <button onClick={() => load()}>查看历史版本</button>
      <p role="status">{error}</p>
      <ul>
        {commits.map((c) => (
          <li key={c.sha}>
            <button onClick={() => load(c.sha)}>
              {c.sha.slice(0, 7)} · {c.message}
            </button>{" "}
            <time>{c.date}</time>
          </li>
        ))}
      </ul>
      {body && <Markdown body={body} />}
    </section>
  );
}

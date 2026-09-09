"use client";
import { useState } from "react";
import Link from "next/link";
import type { Roadmap, Progress, Evidence } from "@/lib/models";
import { kindRoute } from "@/lib/content/catalog";
import type { Kind } from "@/lib/schemas/content";
type Candidate = { id: string; type: Kind; title: string; stageId?: string };
function EvidenceEditor({
  current,
  candidates,
  owner,
  disabled,
  onSave,
}: {
  current: Evidence[];
  candidates: Candidate[];
  owner: boolean;
  disabled: boolean;
  onSave: (e: Evidence[]) => Promise<void>;
}) {
  const [chosen, setChosen] = useState(
    current.filter((e) => e.type !== "commit").map((e) => e.id),
  );
  const [commit, setCommit] = useState(
    current
      .filter((e) => e.type === "commit")
      .map((e) => e.id)
      .join(","),
  );
  return (
    <details className="evidence">
      <summary>
        {current.length} 份证据 · {owner ? "关联输出" : "查看输出"}
      </summary>
      <ul>
        {current.map((e) => {
          const found = candidates.find(
            (c) => c.id === e.id && c.type === e.type,
          );
          return (
            <li key={e.type + e.id}>
              {e.type === "commit" ? (
                <a
                  href={
                    "https://github.com/huayou712-maker/sdet-learning-roadmap/commit/" +
                    e.id
                  }
                >
                  Commit {e.id.slice(0, 7)}
                </a>
              ) : found ? (
                <a href={"/" + kindRoute[found.type] + "/" + found.id}>
                  {found.title}
                </a>
              ) : (
                <span>记录未展示或已删除</span>
              )}
            </li>
          );
        })}
      </ul>
      {owner && (
        <>
          <label>
            关联学习记录
            <select
              multiple
              value={chosen}
              onChange={(e) =>
                setChosen(Array.from(e.target.selectedOptions, (o) => o.value))
              }
            >
              {candidates
                .filter((e) => e.type !== "daily")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.type} · {e.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Commit 完整 SHA（逗号分隔）
            <input value={commit} onChange={(e) => setCommit(e.target.value)} />
          </label>
          <button
            disabled={disabled}
            onClick={() =>
              onSave([
                ...candidates
                  .filter((e) => chosen.includes(e.id) && e.type !== "daily")
                  .map((e) => ({ type: e.type as Evidence["type"], id: e.id })),
                ...commit
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((id) => ({ type: "commit" as const, id })),
              ])
            }
          >
            保存证据关联
          </button>
        </>
      )}
    </details>
  );
}
import { PublicNotice } from "@/components/ui/public-notice";
export function Checklist({
  roadmap,
  progress,
  owner = false,
  sha = "",
  entries = [],
  initialStage,
  initialFilter = "all",
}: {
  roadmap: Roadmap;
  progress: Progress;
  owner?: boolean;
  sha?: string;
  entries?: Candidate[];
  initialStage?: string;
  initialFilter?: string;
}) {
  const [filter, setFilter] = useState(initialFilter);
  const selected =
    roadmap.stages.find((s) => s.id === initialStage) ||
    roadmap.stages.find((s) =>
      s.groups.some((g) =>
        g.items.some((i) => !progress.items[i.id]?.completed),
      ),
    ) ||
    roadmap.stages[0];
  const [state, setState] = useState(progress);
  const [version, setVersion] = useState(sha);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function toggle(id: string, completed: boolean, evidence?: Evidence[]) {
    setBusy(true);
    setMessage("正在提交到 GitHub…");
    try {
      const r = await fetch("/api/progress/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed,
          evidence,
          sha: version,
          acknowledgedPublic: ack,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setState(data.progress);
      setVersion(data.sha);
      setMessage("已保存 · Commit: " + data.commit.slice(0, 7));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {owner && <PublicNotice checked={ack} onChange={setAck} />}
      <div className="toolbar">
        <label>
          学习状态{" "}
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              const url = new URL(location.href);
              url.searchParams.set("status", e.target.value);
              history.replaceState(null, "", url);
            }}
          >
            <option value="all">全部</option>
            <option value="completed">已完成</option>
            <option value="progress">待完成 / 进行中</option>
          </select>
        </label>
        <p>
          完成知识点前至少留下一个有效输出：笔记、练习、作业、项目或问题复盘。
        </p>
      </div>
      <p role="status">{message}</p>
      {message && owner && (
        <button onClick={() => location.reload()}>刷新远端版本</button>
      )}
      <div className="workflow">
        <aside className="workflow-nav">
          <nav aria-label="学习阶段">
            {roadmap.stages.map((s) => {
              const items = s.groups.flatMap((g) => g.items);
              const done = items.filter(
                (i) => state.items[i.id]?.completed,
              ).length;
              return (
                <Link
                  key={s.id}
                  href={"/roadmap?stage=" + s.id + "&status=" + filter}
                  aria-current={s.id === selected?.id ? "page" : undefined}
                >
                  {String(s.order).padStart(2, "0")} · {s.title}
                  <small>
                    {items.length ? Math.round((done / items.length) * 100) : 0}
                    % · {done}/{items.length}
                  </small>
                </Link>
              );
            })}
          </nav>
        </aside>
        {roadmap.stages
          .filter((s) => s.id === selected?.id)
          .map((stage) => {
            const items = stage.groups.flatMap((g) => g.items);
            const done = items.filter(
              (i) => state.items[i.id]?.completed,
            ).length;
            return (
              <section key={stage.id} className="stage-workspace">
                <header>
                  <span className="stage-number">
                    {String(stage.order).padStart(2, "0")}
                  </span>
                  <span>
                    <h2>{stage.title}</h2>
                    <p>{stage.description}</p>
                  </span>
                  <span className="stage-count">
                    {done} / {items.length} ·{" "}
                    {Math.round((done / items.length) * 100)}%
                  </span>
                </header>
                <div className="stage-groups">
                  {stage.groups.map((group) => (
                    <section key={group.id}>
                      <h3>{group.title}</h3>
                      {group.items
                        .filter(
                          (i) =>
                            filter === "all" ||
                            (filter === "completed"
                              ? state.items[i.id]?.completed
                              : !state.items[i.id]?.completed),
                        )
                        .map((item) => (
                          <div key={item.id} id={item.id}>
                            <label className="check-row">
                              <input
                                type="checkbox"
                                checked={
                                  state.items[item.id]?.completed ?? false
                                }
                                disabled={!owner || !ack || busy}
                                onChange={(e) =>
                                  toggle(item.id, e.target.checked)
                                }
                                aria-label={item.title}
                              />
                              <span>{item.title}</span>
                            </label>
                            <EvidenceEditor
                              current={state.items[item.id]?.evidence || []}
                              candidates={entries}
                              owner={owner}
                              disabled={!ack || busy}
                              onSave={(e) =>
                                toggle(
                                  item.id,
                                  state.items[item.id]?.completed ?? false,
                                  e,
                                )
                              }
                            />
                          </div>
                        ))}
                    </section>
                  ))}
                </div>
                <h3>关联学习记录</h3>
                <ul className="related-list">
                  {entries
                    .filter((e) => e.stageId === stage.id)
                    .map((e) => (
                      <li key={e.id}>
                        <Link href={"/" + kindRoute[e.type] + "/" + e.id}>
                          {e.type} · {e.title}
                        </Link>
                      </li>
                    ))}
                </ul>
                {!entries.some((e) => e.stageId === stage.id) && (
                  <p>本阶段尚无可展示关联记录。</p>
                )}
              </section>
            );
          })}
      </div>
    </>
  );
}

"use client";
import { useState } from "react";
import type { Roadmap, Progress } from "@/lib/models";
import { PublicNotice } from "@/components/ui/public-notice";
export function Checklist({
  roadmap,
  progress,
  owner = false,
  sha = "",
}: {
  roadmap: Roadmap;
  progress: Progress;
  owner?: boolean;
  sha?: string;
}) {
  const [filter, setFilter] = useState("all");
  const [state, setState] = useState(progress);
  const [version, setVersion] = useState(sha);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function toggle(id: string, completed: boolean) {
    setBusy(true);
    try {
      const r = await fetch("/api/progress/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed,
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
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
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
      <div className="stage-list">
        {roadmap.stages.map((stage) => {
          const items = stage.groups.flatMap((g) => g.items);
          const done = items.filter((i) => state.items[i.id]?.completed).length;
          return (
            <details
              key={stage.id}
              className="paper stage"
              open={stage.order === 1}
            >
              <summary>
                <span className="stage-number">
                  {String(stage.order).padStart(2, "0")}
                </span>
                <span>
                  <strong>{stage.title}</strong>
                  <small>{stage.description}</small>
                </span>
                <span className="stage-count">
                  {done} / {items.length} ·{" "}
                  {Math.round((done / items.length) * 100)}%
                </span>
              </summary>
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
                        <div key={item.id}>
                          <label className="check-row">
                            <input
                              type="checkbox"
                              checked={state.items[item.id]?.completed ?? false}
                              disabled={!owner || !ack || busy}
                              onChange={(e) =>
                                toggle(item.id, e.target.checked)
                              }
                              aria-label={item.title}
                            />
                            <span>{item.title}</span>
                          </label>
                          <small>
                            {state.items[item.id]?.evidence.length || 0} 份证据
                          </small>
                        </div>
                      ))}
                  </section>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}

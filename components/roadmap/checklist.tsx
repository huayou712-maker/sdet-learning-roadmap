"use client";
import { useState } from "react";
import type { Roadmap, Progress } from "@/lib/models";
export function Checklist({
  roadmap,
  progress,
}: {
  roadmap: Roadmap;
  progress: Progress;
}) {
  const [filter, setFilter] = useState("all");
  return (
    <>
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
      <div className="stage-list">
        {roadmap.stages.map((stage) => {
          const items = stage.groups.flatMap((g) => g.items);
          const done = items.filter(
            (i) => progress.items[i.id]?.completed,
          ).length;
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
                  {done} / {items.length}
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
                            ? progress.items[i.id]?.completed
                            : !progress.items[i.id]?.completed),
                      )
                      .map((item) => (
                        <label className="check-row" key={item.id}>
                          <input
                            type="checkbox"
                            checked={
                              progress.items[item.id]?.completed ?? false
                            }
                            disabled
                            aria-label={item.title}
                          />
                          <span>{item.title}</span>
                        </label>
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

"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { Progress, Roadmap } from "@/lib/models";
import { nextBeginnerTask, taskProgress } from "@/lib/learning-path";
import {
  connectionLabels,
  type RecordConnection,
} from "@/lib/content/learning-connections";
import styles from "./beginner-path.module.css";

const chapterNames: Record<string, string> = {
  start: "环境与 Python",
  design: "测试设计与 HTTP",
  api: "第一组接口测试",
  ci: "最小 CI",
  data: "数据与可靠性",
  ui: "UI 与综合作品",
};

export function BeginnerPath({
  roadmap,
  progress,
  connections = {},
}: {
  roadmap: Roadmap;
  progress: Progress;
  connections?: Record<string, RecordConnection[]>;
}) {
  const root = useRef<HTMLElement>(null);
  const reveal = useCallback((id: string) => {
    const chapter = document.getElementById("task-" + id);
    if (!chapter || !root.current?.contains(chapter)) return;
    const details = chapter.querySelector("details");
    if (details) details.open = true;
    chapter.querySelector("summary")?.focus({ preventScroll: true });
    chapter.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
  useEffect(() => {
    const followHash = () => {
      const task = roadmap.beginnerPath?.find(
        (item) => "#task-" + item.id === window.location.hash,
      );
      if (task) reveal(task.id);
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, [roadmap.beginnerPath, reveal]);
  if (!roadmap.beginnerPath?.length) return null;
  const next = nextBeginnerTask(roadmap, progress);
  return (
    <section
      ref={root}
      className={styles.path}
      aria-labelledby="beginner-path-heading"
    >
      <header className={styles.intro}>
        <p className="eyebrow">PRACTICE FIRST / 入门主线</p>
        <h2 id="beginner-path-heading">先做出第一个可复现的测试</h2>
        <p>按产出推进。下方十阶段是参考目录，不需要全部学完才开始测试。</p>
        <Link href="/guide/beginner">入门指南与执行命令 →</Link>
      </header>
      <div className={styles.journey}>
        <nav className={styles.rail} aria-label="实践任务导航">
          <p className={styles.railTitle}>
            循序实践 <span>{roadmap.beginnerPath.length} 站</span>
          </p>
          <ol>
            {roadmap.beginnerPath.map((task, i) => (
              <li key={task.id}>
                <a
                  href={"#task-" + task.id}
                  aria-current={task.id === next?.id ? "step" : undefined}
                  onClick={() => reveal(task.id)}
                >
                  <span className={styles.marker} aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {chapterNames[task.id] ?? task.title}
                    {task.id === next?.id && <small>建议从这里继续</small>}
                  </span>
                </a>
              </li>
            ))}
          </ol>
          <p className={styles.railHint}>
            每一站都可展开查阅。
            <br />
            展开章节不会更改学习进度。
          </p>
        </nav>
        <ol className={styles.chapters}>
          {roadmap.beginnerPath.map((task, i) => {
            const count = taskProgress(task, progress);
            const records = connections[task.id] ?? [];
            return (
              <li
                key={task.id}
                id={"task-" + task.id}
                data-current={task.id === next?.id}
              >
                <details open={task.id === next?.id}>
                  <summary>
                    <span className={styles.number} aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.summaryText}>
                      <span>{task.title}</span>
                      <small>
                        {count.completed}/{count.total} 自评 ·{" "}
                        {count.withEvidence} 项已自评并附证据
                      </small>
                    </span>
                    <span className={styles.expand} aria-hidden="true" />
                  </summary>
                  <div className={styles.chapterBody}>
                    <p>{task.summary}</p>
                    <div className={styles.deliverable}>
                      <h3>交付什么</h3>
                      <p>{task.deliverable}</p>
                    </div>
                    <h3>怎样验收</h3>
                    <ul className={styles.acceptance}>
                      {task.acceptance.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <h3>用到的知识点</h3>
                    <div className={styles.topics}>
                      {task.topicIds.map((id) => {
                        const stage = roadmap.stages.find((s) =>
                          s.groups.some((g) =>
                            g.items.some((t) => t.id === id),
                          ),
                        );
                        const topic = stage?.groups
                          .flatMap((g) => g.items)
                          .find((t) => t.id === id);
                        return (
                          topic && (
                            <Link
                              key={id}
                              href={"/roadmap?stage=" + stage?.id + "#" + id}
                            >
                              {topic.title} →
                            </Link>
                          )
                        );
                      })}
                    </div>
                    <h3>已有学习记录</h3>
                    {records.length ? (
                      <ul className={styles.records}>
                        {records.map((record) => (
                          <li key={record.type + record.id}>
                            <Link href={record.href}>
                              <span className={styles.recordKind}>
                                {connectionLabels[record.type]}
                              </span>
                              <span>
                                {record.title}
                                <small>{record.reason}</small>
                              </span>
                              <span aria-hidden="true">↗</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.empty}>
                        还没有可展示的关联记录。完成练习后，在原有笔记或作业中标注对应知识点。
                      </p>
                    )}
                    <div className={styles.actions}>
                      <Link href={"/guide/beginner#task-" + task.id}>
                        打开任务说明 →
                      </Link>
                      <small>最多显示 3 条可见记录；关联不等于验收通过。</small>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </div>
      <div className={styles.footnote}>
        <p>
          知识点勾选是自评；关联证据不等于独立验收。示例测试通过不会自动增加学习进度。
        </p>
        <p>
          进阶选修：性能、Redis、Docker 深入、Jenkins、AI / RAG
          评测；算法按目标岗位笔试要求穿插。
        </p>
      </div>
    </section>
  );
}

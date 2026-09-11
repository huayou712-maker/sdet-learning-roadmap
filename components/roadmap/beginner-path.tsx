"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Progress, Roadmap } from "@/lib/models";
import { nextBeginnerTask, taskProgress } from "@/lib/learning-path";
import {
  connectionLabels,
  type RecordConnection,
} from "@/lib/content/learning-connections";
import styles from "./beginner-path.module.css";
import { RoadmapAtlas } from "./roadmap-atlas";
import {
  getRoadmapMotion,
  getServerRoadmapMotion,
  mountRoadmapMotion,
  subscribeRoadmapMotion,
} from "@/lib/roadmap-motion";

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
  const mode = useSyncExternalStore(
    subscribeRoadmapMotion,
    getRoadmapMotion,
    getServerRoadmapMotion,
  );
  useEffect(() => {
    if (mode !== "running" || !root.current) return;
    return mountRoadmapMotion(root.current);
  }, [mode, roadmap.beginnerPath]);
  const reveal = useCallback((id: string) => {
    const chapter = document.getElementById("task-" + id);
    if (!chapter || !root.current?.contains(chapter)) return;
    const details = chapter.querySelector("details");
    if (details) details.open = true;
    root.current
      .querySelectorAll<HTMLElement>("[data-atlas-task]")
      .forEach((link) => {
        if (link.dataset.atlasTask === id) link.dataset.viewing = "true";
        else delete link.dataset.viewing;
      });
    chapter.querySelector("summary")?.focus({ preventScroll: true });
    chapter.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
  useEffect(() => {
    const followHash = () => {
      const task = roadmap.beginnerPath?.find(
        (item) => "#task-" + item.id === window.location.hash,
      );
      if (task) reveal(task.id);
      else
        root.current
          ?.querySelectorAll<HTMLElement>("[data-viewing]")
          .forEach((link) => delete link.dataset.viewing);
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
      data-roadmap-motion={mode}
      data-atlas-scene="resting"
    >
      <RoadmapAtlas
        tasks={roadmap.beginnerPath}
        nextId={next?.id}
        mode={mode}
        reveal={reveal}
      />
      <div className={styles.journey}>
        <div className={styles.chapterHeading}>
          <h2>逐章实践</h2>
          <a href="#practice-atlas">返回山河图 ↑</a>
        </div>
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

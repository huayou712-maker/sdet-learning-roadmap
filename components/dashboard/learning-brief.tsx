import Link from "next/link";
import type { BeginnerTask, Progress, Stage } from "@/lib/models";
import { taskProgress } from "@/lib/learning-path";
import { InkDecoration } from "./media";
import styles from "./learning-brief.module.css";

export function LearningBrief({
  task,
  current,
  nextTitle,
  progress,
  missingEvidence,
  owner,
}: {
  task?: BeginnerTask;
  current?: Stage;
  nextTitle?: string;
  progress: Progress;
  missingEvidence: number;
  owner: boolean;
}) {
  const count = task ? taskProgress(task, progress) : null;
  const href = task
    ? "/roadmap#task-" + task.id
    : current
      ? "/roadmap?stage=" + current.id
      : "/roadmap";
  return (
    <section
      className={"current-stage " + styles.brief}
      aria-label="当前学习入口"
    >
      <header className={styles.heading}>
        <div>
          <p>{owner ? "继续今天的进路" : "学习路径 · 公开只读"}</p>
          <h2>
            {task
              ? "入门主线 · " + task.title
              : "当前阶段 · " + (current?.title || "学习路线")}
          </h2>
        </div>
        <Link href={href}>进入阶段工作区 →</Link>
      </header>
      <div className={styles.body}>
        <div className={styles.task}>
          <div className={styles.landscape} aria-hidden="true">
            <InkDecoration />
          </div>
          <p className={styles.label}>{task ? "本次交付" : "下一步"}</p>
          <p>{task?.summary || current?.description}</p>
          <p className={styles.deliverable}>
            {task
              ? "交付：" + task.deliverable
              : nextTitle || "当前路线已完成，回顾并补充学习证据。"}
          </p>
          {count && (
            <p className={styles.counts} aria-label="当前任务记录">
              知识点已完成{" "}
              <strong>
                {count.completed} / {count.total}
              </strong>
              <span>
                其中有证据 <strong>{count.withEvidence}</strong>
              </span>
            </p>
          )}
          {task && (
            <details className={styles.acceptance}>
              <summary>
                展开验收要求 <span>{task.acceptance.length} 项</span>
              </summary>
              <ul>
                {task.acceptance.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>以实际交付核对要求；展开或阅读不会标记完成。</p>
            </details>
          )}
        </div>
        <nav className={styles.steps} aria-label="学习行动">
          <p className={styles.label}>
            {owner ? "从理解到留下证据" : "查看学习过程"}
          </p>
          <ol>
            <li>
              <Link href={href}>
                <span className={styles.step}>学</span>
                <span>
                  <strong>明确任务与边界</strong>
                  <small>查看知识点和当前学习位置</small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
            <li>
              <Link href="/guide/beginner">
                <span className={styles.step}>练</span>
                <span>
                  <strong>打开实践指南</strong>
                  <small>按任务选择练习与执行命令</small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
            <li>
              <Link href={owner ? "/notes/new" : "/notes"}>
                <span className={styles.step}>记</span>
                <span>
                  <strong>{owner ? "写学习笔记" : "阅读学习笔记"}</strong>
                  <small>留下过程、结果与问题复盘</small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          </ol>
          <p className={styles.footnote}>
            {missingEvidence} 个已完成知识点待补证据
          </p>
          <div className={styles.links}>
            <Link href={owner ? "/daily" : "/timeline"}>
              {owner ? "记录日课" : "查看动态"} ↗
            </Link>
            {owner && <Link href="/training">进入训练台 ↗</Link>}
          </div>
        </nav>
      </div>
    </section>
  );
}

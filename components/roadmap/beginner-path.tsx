import Link from "next/link";
import type { Progress, Roadmap } from "@/lib/models";
import { nextBeginnerTask, taskProgress } from "@/lib/learning-path";
import styles from "./beginner-path.module.css";

export function BeginnerPath({
  roadmap,
  progress,
}: {
  roadmap: Roadmap;
  progress: Progress;
}) {
  if (!roadmap.beginnerPath?.length) return null;
  const next = nextBeginnerTask(roadmap, progress);
  return (
    <section className={styles.path} aria-labelledby="beginner-path-heading">
      <header>
        <p className="eyebrow">PRACTICE FIRST / 入门主线</p>
        <h2 id="beginner-path-heading">先做出第一个可复现的测试</h2>
        <p>按产出推进。下方十阶段是参考目录，不需要全部学完才开始测试。</p>
        <p>
          知识点勾选是自评；关联证据不等于独立验收。示例测试通过不会自动增加学习进度。
        </p>
        <Link href="/guide/beginner">入门指南与执行命令 →</Link>
      </header>
      <ol>
        {roadmap.beginnerPath.map((task, i) => {
          const count = taskProgress(task, progress);
          return (
            <li
              key={task.id}
              id={"task-" + task.id}
              data-current={task.id === next?.id}
            >
              <span className={styles.number} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <details open={task.id === next?.id}>
                <summary>
                  <span>{task.title}</span>
                  <small>
                    {count.completed}/{count.total} 自评 · {count.withEvidence}{" "}
                    项有证据
                  </small>
                </summary>
                <p>{task.summary}</p>
                <h3>交付什么</h3>
                <p>{task.deliverable}</p>
                <h3>怎样验收</h3>
                <ul>
                  {task.acceptance.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <div className={styles.topics}>
                  {task.topicIds.map((id) => {
                    const stage = roadmap.stages.find((s) =>
                      s.groups.some((g) => g.items.some((t) => t.id === id)),
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
                <Link href={"/guide/beginner#task-" + task.id}>
                  打开任务说明 →
                </Link>
              </details>
            </li>
          );
        })}
      </ol>
      <p>
        进阶选修：性能、Redis、Docker 深入、Jenkins、AI / RAG
        评测；算法按目标岗位笔试要求穿插。
      </p>
    </section>
  );
}

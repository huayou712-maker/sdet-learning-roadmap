import Link from "next/link";
import type { Roadmap, Progress } from "@/lib/models";
import styles from "./workspace.module.css";

export function Journey({
  roadmap,
  progress,
  currentId,
}: {
  roadmap: Roadmap;
  progress: Progress;
  currentId?: string;
}) {
  return (
    <section className={styles.journey} aria-label="十阶学习行迹">
      <div className={styles.journeyHeading}>
        <span>十阶行迹</span>
        <small>从知识到可验证的作品</small>
      </div>
      <ol>
        {roadmap.stages.map((stage) => {
          const items = stage.groups.flatMap((group) => group.items);
          const done = items.filter(
            (item) => progress.items[item.id]?.completed,
          ).length;
          const completed = items.length > 0 && done === items.length;
          const current = stage.id === currentId;
          return (
            <li key={stage.id}>
              <Link
                href={"/roadmap?stage=" + stage.id}
                aria-current={current ? "step" : undefined}
                data-completed={completed || undefined}
                title={
                  stage.title + " · " + done + "/" + items.length + " 已完成"
                }
              >
                <span className={styles.node} aria-hidden="true">
                  {completed ? "✓" : String(stage.order).padStart(2, "0")}
                </span>
                <span className={styles.stageTitle}>{stage.title}</span>
                <small>
                  {current ? "当前阶段" : done + " / " + items.length}
                </small>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

import Link from "next/link";
import {
  connectionLabels,
  type NoteConnections,
} from "@/lib/content/learning-connections";
import styles from "./learning-connections.module.css";

export function LearningConnections({
  connections,
}: {
  connections: NoteConnections;
}) {
  const { topics, tasks, records, fallback } = connections;
  return (
    <section
      id="learning-connections"
      className={styles.connections + " reading-connections"}
      aria-labelledby="learning-connections-heading"
    >
      <p className={styles.eyebrow}>秘笈关联 / LEARN → APPLY</p>
      <h2 id="learning-connections-heading">这篇笔记，用在何处</h2>
      <p className={styles.intro}>
        从理解走向练习，再回到证据。这里按已有标注关联，不代表已经掌握。
      </p>
      <div className={styles.columns}>
        <div>
          <h3>对应实践</h3>
          {tasks.length ? (
            <ul className={styles.tasks}>
              {tasks.map((task) => (
                <li key={task.id}>
                  <Link href={task.href}>
                    <span>{task.title}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              {topics.length
                ? "尚未关联到入门主线。已标注的知识点可在下方查阅。"
                : "从学习路线选择练习，为笔记标注对应知识点。"}
            </p>
          )}
          {topics.length ? (
            <details className={styles.topics}>
              <summary>关联知识点（{topics.length}）</summary>
              <ul>
                {topics.map((topic) => (
                  <li key={topic.id}>
                    <Link href={topic.href}>{topic.title} →</Link>
                    <small>
                      {topic.declared ? "笔记标注" : ""}
                      {topic.declared && topic.evidence ? " · " : ""}
                      {topic.evidence ? "已登记证据" : ""}
                    </small>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className={styles.empty}>
              没有已标注的有效知识点，也未登记为知识点证据。
            </p>
          )}
          <Link className={styles.more} href="/roadmap">
            查看完整学习路线 →
          </Link>
        </div>
        <div>
          <h3>{fallback ? "同阶段参考" : "一起查阅"}</h3>
          {records.length ? (
            <ul className={styles.records}>
              {records.map((record) => (
                <li key={record.type + record.id}>
                  <span className={styles.kind}>
                    {connectionLabels[record.type]}
                  </span>
                  <Link href={record.href}>
                    {record.title} <span aria-hidden="true">↗</span>
                  </Link>
                  <small>{record.reason}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              暂无可展示的关联记录。为笔记、作业或排障手记标注相同知识点后，会在这里相遇。
            </p>
          )}
          <Link className={styles.more} href="/notes">
            回到知识库 →
          </Link>
        </div>
      </div>
    </section>
  );
}

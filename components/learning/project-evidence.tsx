import Link from "next/link";
import { entryUrl } from "@/lib/content/catalog";
import type { Entry } from "@/lib/schemas/content";
import styles from "./project-evidence.module.css";

/** Presentation only: supplied links are not execution results. */
export function ProjectEvidence({
  entry,
  entries,
  branch,
}: {
  entry: Entry;
  entries: Entry[];
  branch: string;
}) {
  const cases = entries.filter(
    (item) =>
      item.type === "debug" &&
      item.projectId === entry.id &&
      item.showInPortfolio &&
      !item.deletedAt,
  );
  return (
    <section
      className={styles.evidence}
      aria-label={entry.title + "的证据清单"}
    >
      <h3>检查项目依据</h3>
      <p className={styles.hint}>
        以下为已提供的资料链接，运行结果需打开原始证据核对。
      </p>
      <dl>
        <div>
          <dt>源代码</dt>
          <dd>
            {entry.repositoryPath && (
              <a
                href={
                  "https://github.com/huayou712-maker/sdet-learning-roadmap/tree/" +
                  branch +
                  "/" +
                  entry.repositoryPath
                }
              >
                仓库内代码 ↗
              </a>
            )}
            {entry.externalRepository && (
              <a href={entry.externalRepository}>外部仓库 ↗</a>
            )}
            {!entry.repositoryPath && !entry.externalRepository && (
              <span className={styles.missing}>尚未提供代码位置</span>
            )}
          </dd>
        </div>
        <div>
          <dt>测试报告</dt>
          <dd>
            {entry.reportUrl ? (
              <>
                <a href={entry.reportUrl}>测试报告 ↗</a>
                <small>已提供链接 · 未自动验真</small>
              </>
            ) : (
              <span className={styles.missing}>尚未提供报告</span>
            )}
          </dd>
        </div>
        <div>
          <dt>演示</dt>
          <dd>
            {entry.demoUrl ? (
              <a href={entry.demoUrl}>演示 ↗</a>
            ) : (
              <span className={styles.missing}>尚未提供演示</span>
            )}
          </dd>
        </div>
        <div>
          <dt>问题复盘</dt>
          <dd>
            {cases.length ? (
              cases.map((item) => (
                <Link key={item.id} href={entryUrl(item)}>
                  {item.title} ↗
                </Link>
              ))
            ) : (
              <span className={styles.missing}>暂无公开关联案例</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

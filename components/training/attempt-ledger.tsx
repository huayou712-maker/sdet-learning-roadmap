import {
  faults,
  resultLabels,
  REPOSITORY_URL,
  type Attempt,
} from "@/lib/training/schema";
import { StatePanel } from "@/components/ui/state-panel";
import styles from "./training.module.css";
import { VerifyCI } from "./ci-verification";

function AttemptRecord({
  attempt: a,
  latest = false,
}: {
  attempt: Attempt;
  latest?: boolean;
}) {
  return (
    <article
      className={styles.attempt}
      aria-label={(latest ? "最近一次练习" : "历史练习") + " " + a.recordedAt}
    >
      <h3>
        <time dateTime={a.recordedAt}>{a.recordedAt.slice(0, 10)}</time> ·{" "}
        <a href={REPOSITORY_URL + "/commit/" + a.commitSha}>
          {a.commitSha.slice(0, 7)}
        </a>
      </h3>
      <p className={styles.baseline} data-passed={a.normal === "passed"}>
        正常实现：
        {a.normal === "passed"
          ? "通过"
          : a.normal === "failed"
            ? "失败／环境阻塞"
            : "未验证"}
      </p>
      {latest && a.normal !== "passed" && (
        <p className={styles.warning}>
          先让独立测试在正常实现上通过，再判断故障检出能力。
        </p>
      )}
      <dl className={styles.results}>
        {faults.map((fault) => (
          <div key={fault.id}>
            <dt>{fault.title}</dt>
            <dd data-result={a.faults[fault.id]}>
              {resultLabels[a.faults[fault.id]]}
            </dd>
          </div>
        ))}
      </dl>
      <p className={styles.hint}>
        自报结果：检出{" "}
        {faults.filter((f) => a.faults[f.id] === "detected").length} /{" "}
        {faults.length} 项。以原始运行记录核对。
      </p>
      {latest &&
        a.normal === "passed" &&
        faults.some((f) => a.faults[f.id] !== "detected") && (
          <details className={styles.followup}>
            <summary>查看未检出项的检查提示</summary>
            <ul>
              {faults
                .filter((f) => a.faults[f.id] !== "detected")
                .map((fault) => (
                  <li key={fault.id}>
                    <strong>
                      {fault.title} · {resultLabels[a.faults[fault.id]]}
                    </strong>
                    <p>{fault.suggestion}</p>
                  </li>
                ))}
            </ul>
          </details>
        )}
      <h4>这次复盘</h4>
      <p className={styles.prose}>{a.reflection}</p>
      <div className={styles.evidenceLinks}>
        <a href={REPOSITORY_URL + "/commit/" + a.commitSha}>核对代码版本 ↗</a>
        {a.ciUrl ? (
          <a href={a.ciUrl}>CI 运行链接（未核验）→</a>
        ) : (
          <span>未附 CI 运行链接</span>
        )}
      </div>
      {a.ciUrl && <VerifyCI attemptId={a.id} />}
    </article>
  );
}

export function AttemptLedger({ attempts }: { attempts: Attempt[] }) {
  const latest = attempts.at(-1);
  const earlier = attempts.slice(0, -1).reverse();
  return (
    <aside
      className={styles.ledger}
      aria-label="练习证据档案"
      id="practice-evidence"
    >
      <p className={styles.sectionLabel}>核对证据</p>
      <h2>验收记录</h2>
      <p>学习者自报 · 未自动验真</p>
      <p className={styles.hint}>
        提交时只检查指定代码文件在 commit 中存在。可手动核对 CI 来源与元数据；
        不执行代码，不自动增加知识点进度。
      </p>
      {latest ? (
        <>
          <p className={styles.latestLabel}>最近一次记录</p>
          <AttemptRecord attempt={latest} latest />
        </>
      ) : (
        <StatePanel
          compact
          title="还没有独立练习记录"
          actions={<a href="#practice-commands">先查看执行命令 →</a>}
        >
          <p>
            先运行自己的测试，再提交这次结果。这里会保留对应代码版本与复盘。
          </p>
        </StatePanel>
      )}
      {!!earlier.length && (
        <details className={styles.earlier}>
          <summary>更早的练习记录（{earlier.length}）</summary>
          {earlier.map((attempt) => (
            <AttemptRecord key={attempt.id} attempt={attempt} />
          ))}
        </details>
      )}
    </aside>
  );
}

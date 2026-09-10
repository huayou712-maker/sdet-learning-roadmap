"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  faults,
  resultLabels,
  REPOSITORY_URL,
  TEST_PATH,
  type Attempt,
  type TrainingCommand,
} from "@/lib/training/schema";
import styles from "./training.module.css";
type Props = {
  attempts: Attempt[];
  disabled: boolean;
  save: (command: TrainingCommand) => Promise<boolean>;
};
export function Practice({ attempts, disabled, save }: Props) {
  const [id, setId] = useState(() => crypto.randomUUID());
  const [commitSha, setCommitSha] = useState("");
  const [normal, setNormal] = useState<Attempt["normal"]>("not_run");
  const [results, setResults] = useState<Attempt["faults"]>({
    age: "not_run",
    duplicate: "not_run",
    status: "not_run",
  });
  const [reflection, setReflection] = useState("");
  const [ciUrl, setCiUrl] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      await save({
        action: "attempt",
        attempt: {
          id,
          commitSha: commitSha.trim(),
          normal,
          faults: results,
          reflection,
          ciUrl: ciUrl.trim(),
        },
      })
    ) {
      setId(crypto.randomUUID());
      setReflection("");
    }
  }
  return (
    <div className={styles.columns}>
      <section>
        <h2>注册 API · 独立练习</h2>
        <p>先按需求写自己的测试，再证明断言能检出错误实现。</p>
        <p>
          <Link href="/guide/beginner">环境准备与实践指南 →</Link>
        </p>
        <p>
          <a
            href={
              REPOSITORY_URL +
              "/blob/main/projects/beginner-api-lab/EXERCISES.md"
            }
          >
            查看练习契约与交付要求 →
          </a>
        </p>
        <div className={styles.command}>
          <strong>在 beginner-api-lab 目录运行（Windows）</strong>
          <pre>
            {
              ".\\.venv\\Scripts\\python.exe -m pytest tests/test_registration_practice.py -q\n.\\.venv\\Scripts\\python.exe selfcheck.py tests/test_registration_practice.py"
            }
          </pre>
        </div>
        <p>
          验收代码路径：<code>{TEST_PATH}</code>
          。维护者示范测试仅验证环境，不计作个人成果。
        </p>
        <form
          onSubmit={submit}
          className={styles.form}
          aria-label="提交独立练习"
        >
          <fieldset disabled={disabled}>
            <legend>记录这次尝试</legend>
            <label>
              独立测试的 commit SHA
              <input
                required
                pattern="[a-f0-9]{40}"
                maxLength={40}
                value={commitSha}
                onChange={(e) => setCommitSha(e.target.value)}
                placeholder="完整的 40 位 commit SHA"
              />
            </label>
            <label>
              正常实现的测试结果
              <select
                value={normal}
                onChange={(e) => {
                  const value = e.target.value as Attempt["normal"];
                  setNormal(value);
                  if (value !== "passed")
                    setResults({
                      age: "not_run",
                      duplicate: "not_run",
                      status: "not_run",
                    });
                }}
              >
                <option value="not_run">未验证</option>
                <option value="passed">通过</option>
                <option value="failed">失败／环境阻塞</option>
              </select>
            </label>
            <div className={styles.matrix}>
              {faults.map((f) => (
                <label key={f.id}>
                  {f.title}
                  <select
                    value={results[f.id]}
                    onChange={(e) =>
                      setResults({
                        ...results,
                        [f.id]: e.target.value as Attempt["faults"]["age"],
                      })
                    }
                  >
                    <option value="not_run">未验证</option>
                    <option value="detected" disabled={normal !== "passed"}>
                      检出（断言失败）
                    </option>
                    <option value="missed">漏检</option>
                  </select>
                </label>
              ))}
            </div>
            <p className={styles.hint}>
              正常实现先通过，才可标记“检出”。collection
              error、skip、环境失败不能算检出。
            </p>
            <label>
              复盘与下一步
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="缺了什么断言？补充后怎样重新验证？"
              />
            </label>
            <label>
              本仓库 CI 运行链接（可选）
              <input
                type="url"
                value={ciUrl}
                onChange={(e) => setCiUrl(e.target.value)}
                placeholder={REPOSITORY_URL + "/actions/runs/…"}
              />
            </label>
            <button type="submit">提交练习记录</button>
          </fieldset>
        </form>
      </section>
      <aside className={styles.ledger}>
        <h2>验收记录</h2>
        <p>学习者自报 · 未自动验真</p>
        <p className={styles.hint}>
          系统只检查指定代码文件在 commit 中存在；不执行代码，不验证 CI
          结果，不自动增加知识点进度。
        </p>
        {!attempts.length && (
          <p className="empty">
            还没有独立练习记录。先运行自己的测试，再提交这次结果。
          </p>
        )}
        {[...attempts].reverse().map((a) => (
          <article key={a.id} className={styles.attempt}>
            <h3>
              <time>{a.recordedAt.slice(0, 10)}</time> ·{" "}
              <a href={REPOSITORY_URL + "/commit/" + a.commitSha}>
                {a.commitSha.slice(0, 7)}
              </a>
            </h3>
            <p>
              正常实现：
              {a.normal === "passed"
                ? "通过"
                : a.normal === "failed"
                  ? "失败／环境阻塞"
                  : "未验证"}
            </p>
            <dl className={styles.results}>
              {faults.map((f) => (
                <div key={f.id}>
                  <dt>{f.title}</dt>
                  <dd data-result={a.faults[f.id]}>
                    {resultLabels[a.faults[f.id]]}
                  </dd>
                </div>
              ))}
            </dl>
            <p className={styles.prose}>{a.reflection}</p>
            {a.ciUrl && <a href={a.ciUrl}>CI 运行链接（未核验）→</a>}
          </article>
        ))}
      </aside>
    </div>
  );
}

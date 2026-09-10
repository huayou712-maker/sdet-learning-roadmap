"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  faults,
  REPOSITORY_URL,
  TEST_PATH,
  type Attempt,
  type TrainingCommand,
} from "@/lib/training/schema";
import styles from "./training.module.css";
import { CommandBlock } from "./command-block";
import { AttemptLedger } from "./attempt-ledger";
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
    <>
      <nav aria-label="练习流程" className={styles.process}>
        <ol>
          <li>
            <a href="#practice-commands">
              <span>1</span>执行命令
            </a>
          </li>
          <li>
            <a href="#practice-form">
              <span>2</span>记录结果
            </a>
          </li>
          <li>
            <a href="#practice-evidence">
              <span>3</span>核对证据
            </a>
          </li>
        </ol>
      </nav>
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
          <section
            id="practice-commands"
            className={styles.commands}
            aria-label="执行练习命令"
          >
            <h3>在 beginner-api-lab 目录运行（Windows）</h3>
            <CommandBlock
              title="正常实现"
              command={
                ".\\.venv\\Scripts\\python.exe -m pytest tests/test_registration_practice.py -q"
              }
            >
              先确认自己的测试在正常实现上通过。
            </CommandBlock>
            <CommandBlock
              title="故障自检"
              command={
                ".\\.venv\\Scripts\\python.exe selfcheck.py tests/test_registration_practice.py"
              }
            >
              逐项检查错误实现。目标断言失败才表示检出；collection error、skip
              或环境错误不算。
            </CommandBlock>
          </section>
          <p>
            验收代码路径：<code>{TEST_PATH}</code>
            。维护者示范测试仅验证环境，不计作个人成果。
          </p>
          <form
            onSubmit={submit}
            className={styles.form}
            aria-label="提交独立练习"
            id="practice-form"
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
        <AttemptLedger attempts={attempts} />
      </div>
    </>
  );
}

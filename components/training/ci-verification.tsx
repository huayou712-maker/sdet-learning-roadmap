"use client";
import { useRef, useState } from "react";
import {
  ciStatusLabels,
  ciVerificationSchema,
  type CIVerification,
} from "@/lib/training/ci-model";
import styles from "./training.module.css";

export function VerifyCI({ attemptId }: { attemptId: string }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CIVerification | null>(null);
  async function verify() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/training/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "读取失败，请稍后手动重试。");
      const parsed = ciVerificationSchema.safeParse(data);
      if (!parsed.success) throw new Error("核验响应不完整，未采信。");
      setResult(parsed.data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "读取失败，请稍后手动重试。",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const status = (value: string) =>
    Object.hasOwn(ciStatusLabels, value) ? ciStatusLabels[value] : "未确认";
  return (
    <section className={styles.ciVerification} aria-label="CI 元数据核对">
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={verify}
      >
        {busy ? "正在核对 CI…" : "核对 CI 来源与版本"}
      </button>
      <p className={styles.hint}>
        手动只读查询，不运行测试、不更新成绩。每个服务实例每分钟最多 3
        次、每小时最多 8 次；无后台轮询。
      </p>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div aria-live="polite">
          <h4>元数据核对结果 · 不代表练习验收通过</h4>
          <dl className={styles.verificationRows}>
            <div>
              <dt>运行来源</dt>
              <dd>
                {result.sourceMatches ? "本仓库" : "不一致，停止后续核对"}
              </dd>
            </div>
            <div>
              <dt>运行标注的提交</dt>
              <dd>
                {result.commitMatches
                  ? "与本次记录一致"
                  : "版本不一致，不能用于本次记录"}
              </dd>
            </div>
            <div>
              <dt>指定 Python 工作流</dt>
              <dd>{result.workflowMatches ? "路径一致" : "工作流不匹配"}</dd>
            </div>
            <div>
              <dt>第 {result.runAttempt} 次运行</dt>
              <dd>{status(result.status)}</dd>
            </div>
            <div>
              <dt>registration-lab 作业</dt>
              <dd>
                {status(result.jobStatus)}
                {result.jobsTruncated ? "；列表未完整读取" : ""}
              </dd>
            </div>
            <div>
              <dt>提交版本中的自检配置</dt>
              <dd>
                {
                  {
                    personal:
                      "声明了个人测试文件；仍需核对实际 checkout、条件与日志",
                    demonstration:
                      "仅识别到示范故障自检，不证明个人测试检出了故障",
                    other: "未识别到受支持的 selfcheck 命令",
                    unknown: "未读取或配置无法静态核对",
                  }[result.declaration]
                }
              </dd>
            </div>
            <div>
              <dt>运行下的 JUnit 产物</dt>
              <dd>
                {
                  {
                    present: "存在未过期产物，未确认其所属重跑轮次",
                    expired: "产物已过期",
                    missing: "当前列表未找到",
                    not_checked: "尚未核对",
                  }[result.artifact]
                }
                {result.artifactsTruncated ? "；列表不完整" : ""}
              </dd>
            </div>
          </dl>
          <p className={styles.warning}>
            报告内容未核验。全绿、步骤名称或配置声明都不能证明测试覆盖、独立完成或能力掌握。个人基线与三项故障仍需原始报告核对。
          </p>
          <p className={styles.hint}>
            核对时间：{result.checkedAt}；只保留在本次页面内存，不写回 GitHub。
          </p>
        </div>
      )}
    </section>
  );
}

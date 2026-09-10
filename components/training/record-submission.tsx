"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { recordInput } from "@/lib/schemas/content";
import { assertNoCredentials } from "@/lib/security/credentials";
import { z } from "zod";
import styles from "./training.module.css";

const receipt = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,101}$/),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
});
export function useRecordSubmission(kind: "assignments" | "debug-journal") {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<z.infer<typeof receipt> | null>(null);
  async function submit(payload: unknown) {
    if (lock.current || uncertain) return false;
    const parsed = recordInput.safeParse(payload);
    if (!parsed.success) {
      setMessage("请检查必填字段，并确认公开仓库提示。");
      return false;
    }
    try {
      assertNoCredentials(parsed.data);
    } catch {
      setMessage("检测到疑似凭据，请脱敏后再提交。");
      return false;
    }
    lock.current = true;
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const response = await fetch("/api/" + kind, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) setUncertain(true);
        setMessage(
          typeof data.error === "string"
            ? data.error
            : "提交失败，输入已保留。",
        );
        return false;
      }
      const saved = receipt.parse(data);
      setResult(saved);
      setMessage("已提交到 GitHub，查看记录核对本次内容。");
      return true;
    } catch {
      setUncertain(true);
      setMessage(
        "提交结果待核对，输入已保留。可能已经提交，请先在记录列表确认，勿直接重复提交。",
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    uncertain,
    message,
    result,
    kind,
    submit,
    allowRetry: () => {
      setUncertain(false);
      setMessage("你已确认未新增记录，可以手动重试。");
    },
  };
}
export function RecordSubmissionFeedback({
  submission,
}: {
  submission: ReturnType<typeof useRecordSubmission>;
}) {
  return (
    <div className={styles.submissionFeedback} aria-live="polite">
      {submission.busy && <p>正在提交到 GitHub…</p>}
      {submission.message && <p>{submission.message}</p>}
      {submission.result && (
        <p>
          <Link href={"/" + submission.kind + "/" + submission.result.id}>
            查看已提交记录 →
          </Link>
          {" · "}
          <a
            href={
              "https://github.com/huayou712-maker/sdet-learning-roadmap/commit/" +
              submission.result.commit
            }
          >
            Commit {submission.result.commit.slice(0, 7)}
          </a>
        </p>
      )}
      {submission.uncertain && (
        <div>
          <p>
            <Link href={"/" + submission.kind} target="_blank">
              另开记录列表核对 ↗
            </Link>
          </p>
          <button
            type="button"
            className="secondary"
            onClick={submission.allowRetry}
          >
            我已核对没有新增记录，允许重试
          </button>
        </div>
      )}
    </div>
  );
}

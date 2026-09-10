import { REPOSITORY_URL } from "@/lib/training/schema";
import styles from "./training.module.css";

export function SyncFeedback({
  busy,
  operation,
  error,
  message,
  commit,
}: {
  busy: boolean;
  operation: "read" | "write";
  error: string;
  message: string;
  commit: string;
}) {
  return (
    <div
      className={styles.feedback}
      data-tone={error ? "error" : busy ? "busy" : message ? "success" : "idle"}
    >
      <div
        role="status"
        aria-label="训练同步状态"
        aria-live="polite"
        aria-atomic="true"
      >
        {busy
          ? operation === "write"
            ? "正在提交到 GitHub…请勿关闭页面。"
            : "正在读取 GitHub 最新版本…当前表单输入保留。"
          : error
            ? ""
            : message}
        {!busy && !error && commit && (
          <span>
            {" "}
            · Commit:{" "}
            <a href={REPOSITORY_URL + "/commit/" + commit}>
              {commit.slice(0, 7)}
            </a>
          </span>
        )}
      </div>
      {error && (
        <div role="alert">
          <strong>
            {operation === "write" ? "本次提交未确认成功" : "最新版本读取失败"}
          </strong>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, type ReactNode } from "react";
import styles from "./training.module.css";

export function CommandBlock({
  title,
  command,
  children,
}: {
  title: string;
  command: string;
  children: ReactNode;
}) {
  const [feedback, setFeedback] = useState("");
  const [copying, setCopying] = useState(false);
  async function copy() {
    setCopying(true);
    setFeedback("");
    try {
      await navigator.clipboard.writeText(command);
      setFeedback("命令已复制，请在自己的练习目录核对后运行。");
    } catch {
      setFeedback("无法访问剪贴板，请手动选择并复制下面的命令。");
    } finally {
      setCopying(false);
    }
  }
  return (
    <div className={styles.command}>
      <div className={styles.commandHeading}>
        <strong>{title}</strong>
        <button
          type="button"
          onClick={copy}
          disabled={copying}
          aria-label={"复制" + title + "命令"}
        >
          {copying ? "复制中…" : "复制命令"}
        </button>
      </div>
      <pre tabIndex={0} aria-label={title + "命令"}>
        <code>{command}</code>
      </pre>
      <p>{children}</p>
      {feedback && (
        <p className={styles.copyFeedback} role="status">
          {feedback}
        </p>
      )}
    </div>
  );
}

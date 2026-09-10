import type { ReactNode } from "react";
import styles from "./state-panel.module.css";

export function StatePanel({
  title,
  children,
  actions,
  kind = "empty",
  compact = false,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  kind?: "empty" | "loading" | "error" | "restricted" | "missing";
  compact?: boolean;
}) {
  const Heading = compact ? "h3" : "h1";
  return (
    <section className={styles.panel} data-kind={kind} data-compact={compact}>
      <p className={styles.label}>
        {
          {
            empty: "下一步",
            loading: "正在读取",
            error: "读取未完成",
            restricted: "访问范围",
            missing: "记录未找到",
          }[kind]
        }
      </p>
      <Heading>{title}</Heading>
      <div className={styles.description}>{children}</div>
      {kind === "loading" && (
        <div className={styles.skeleton} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      {actions && <div className={styles.actions}>{actions}</div>}
    </section>
  );
}

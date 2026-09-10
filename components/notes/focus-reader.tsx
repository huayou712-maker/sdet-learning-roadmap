"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./focus-reader.module.css";

export function FocusReader({ children }: { children: ReactNode }) {
  const [focused, setFocused] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const contentId = useId();
  useEffect(() => {
    if (!focused) return;
    const exit = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        document.querySelector("dialog[open]")
      )
        return;
      setFocused(false);
      toggle.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", exit);
    return () => document.removeEventListener("keydown", exit);
  }, [focused]);
  return (
    <div className={styles.reader} data-focused={focused}>
      <div className={styles.tools} role="group" aria-label="阅读工具">
        {focused ? (
          <Link href="/notes">← 知识库</Link>
        ) : (
          <span className={styles.hint}>阅读笔记</span>
        )}
        <button
          ref={toggle}
          type="button"
          aria-pressed={focused}
          aria-controls={contentId}
          onClick={() => setFocused((value) => !value)}
        >
          {focused ? "退出专注" : "专注阅读"}
          <span aria-hidden="true">{focused ? " ↙" : " ↗"}</span>
        </button>
        {focused && <span className={styles.hint}>Esc 退出</span>}
      </div>
      <div id={contentId}>{children}</div>
    </div>
  );
}

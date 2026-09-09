"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { workspaceCommands } from "@/components/layout/navigation";
import { Icon } from "./icon";
import styles from "./command-palette.module.css";

export function CommandPalette({ owner }: { owner: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const id = useId();
  const normalized = query.trim().toLocaleLowerCase();
  const matches = workspaceCommands(owner).filter((command) =>
    (command.label + " " + command.keywords)
      .toLocaleLowerCase()
      .includes(normalized),
  );
  const commands = normalized
    ? [
        ...matches,
        {
          href: "/search?q=" + encodeURIComponent(query.trim()),
          label: "搜索学习记录：" + query.trim(),
          hint: "查找笔记、项目与证据",
          keywords: "",
        },
      ]
    : matches;
  const active = Math.min(selected, commands.length - 1);

  const open = useCallback(() => {
    if (dialog.current?.open) return;
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setQuery("");
    setSelected(0);
    dialog.current?.showModal();
    input.current?.focus();
  }, []);
  const close = () => dialog.current?.close();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.isComposing ||
        event.altKey ||
        event.key.toLowerCase() !== "k" ||
        !(event.ctrlKey || event.metaKey)
      )
        return;
      event.preventDefault();
      if (dialog.current?.open) dialog.current.close();
      else open();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!dialog.current?.open) return;
    results.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, query]);

  return (
    <>
      <button
        ref={trigger}
        className={styles.trigger}
        onClick={open}
        aria-label="打开快捷导航"
        aria-haspopup="dialog"
        aria-controls={id}
        title="快捷导航 · Ctrl / Cmd + K"
      >
        <span aria-hidden="true">⌘</span>
        <kbd>K</kbd>
      </button>
      <dialog
        ref={dialog}
        id={id}
        className={styles.dialog}
        aria-label="快捷导航"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => {
          const target = previousFocus.current;
          if (target?.isConnected) target.focus();
          else trigger.current?.focus();
        }}
      >
        <div className={styles.surface}>
          <div className={styles.topline}>
            <span>行知 / 快捷导航</span>
            <button onClick={close} aria-label="关闭快捷导航">
              Esc
            </button>
          </div>
          <div className={styles.search}>
            <Icon name="search" />
            <input
              ref={input}
              role="combobox"
              aria-label="搜索页面或学习记录"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={id + "-results"}
              aria-activedescendant={id + "-option-" + active}
              value={query}
              placeholder="想去哪里，或找点什么？"
              autoComplete="off"
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(0);
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setSelected(
                    (active +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      commands.length) %
                      commands.length,
                  );
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  (
                    results.current?.querySelector(
                      '[aria-selected="true"]',
                    ) as HTMLAnchorElement | null
                  )?.click();
                }
              }}
            />
          </div>
          <p className={styles.caption}>
            {normalized ? "匹配页面与全文检索" : "常用页面"}
            <span>{commands.length} 个入口</span>
          </p>
          <div
            ref={results}
            id={id + "-results"}
            role="listbox"
            aria-label="导航结果"
            className={styles.results}
          >
            {commands.map((command, index) => (
              <Link
                key={command.href}
                href={command.href}
                id={id + "-option-" + index}
                role="option"
                aria-selected={index === active}
                tabIndex={-1}
                className={styles.result}
                onMouseEnter={() => setSelected(index)}
                onClick={close}
              >
                <span className={styles.mark} aria-hidden="true">
                  {command.href === "/notes/new" ? "+" : "↗"}
                </span>
                <span>
                  <strong>{command.label}</strong>
                  <small>{command.hint}</small>
                </span>
                <span className={styles.enter} aria-hidden="true">
                  ↵
                </span>
              </Link>
            ))}
          </div>
          <div className={styles.footer}>
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> 选择 <kbd>Enter</kbd> 打开
            </span>
            <Link href="/search" onClick={close}>
              完整搜索 →
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}

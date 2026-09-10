"use client";
import { useEffect, useRef } from "react";
import { searchTypes, type SearchType } from "@/lib/search";
export function SearchCommand({
  query,
  type = "all",
}: {
  query: string;
  type?: SearchType;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        e.preventDefault();
        input.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === input.current) {
        e.preventDefault();
        if (input.current) input.current.value = "";
        input.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    input.current?.setAttribute("data-shortcuts", "ready");
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form className="command-search">
      <label>
        关键词
        <input
          ref={input}
          name="q"
          defaultValue={query}
          maxLength={200}
          placeholder="搜索笔记、作业、项目、问题、路线…"
        />
      </label>
      <label>
        内容类型
        <select name="type" defaultValue={type}>
          {Object.entries(searchTypes).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button>搜索</button>
      <small>
        / 聚焦 · Enter 搜索 · Tab 选择结果后 Enter 打开 · Escape 清空输入
      </small>
    </form>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { decodeDraft, draftKey, encodeDraft } from "@/lib/training/drafts";
import styles from "./training.module.css";

// One in-memory guard for all dirty forms, so one navigation asks only once.
const dirtyForms = new Set<symbol>();
function beforeUnload(event: BeforeUnloadEvent) {
  if (!dirtyForms.size) return;
  event.preventDefault();
  event.returnValue = "";
}
function beforeLink(event: MouseEvent) {
  if (
    !dirtyForms.size ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey
  )
    return;
  const anchor =
    event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (
    !(anchor instanceof HTMLAnchorElement) ||
    anchor.target === "_blank" ||
    anchor.hasAttribute("download")
  )
    return;
  const next = new URL(anchor.href, window.location.href);
  if (
    next.origin === location.origin &&
    next.pathname === location.pathname &&
    (next.search === location.search || next.pathname === "/training")
  )
    return;
  if (
    !window.confirm(
      "有尚未提交到 GitHub 的输入。离开前请保存本机草稿；仍要离开吗？",
    )
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
}
export function useUnsavedGuard(dirty: boolean) {
  const key = useRef(Symbol("unsaved-form"));
  useEffect(() => {
    if (!dirty) return;
    const id = key.current;
    dirtyForms.add(id);
    if (dirtyForms.size === 1) {
      window.addEventListener("beforeunload", beforeUnload);
      document.addEventListener("click", beforeLink, true);
    }
    return () => {
      dirtyForms.delete(id);
      if (!dirtyForms.size) {
        window.removeEventListener("beforeunload", beforeUnload);
        document.removeEventListener("click", beforeLink, true);
      }
    };
  }, [dirty]);
}
export function useTrainingDraft<T>({
  scope,
  value,
  schema,
  dirty,
  restore,
}: {
  scope: string;
  value: T;
  schema: z.ZodType<T>;
  dirty: boolean;
  restore: (value: T) => void;
}) {
  const [message, setMessage] = useState("");
  const owned = useRef<{ key: string; revision: string } | null>(null);
  useUnsavedGuard(dirty);
  function saveDraft() {
    try {
      const record = encodeDraft(scope, value, schema);
      localStorage.setItem(draftKey(scope), record.text);
      owned.current = { key: draftKey(scope), revision: record.revision };
      setMessage(
        "本机草稿已保存，尚未提交到 GitHub；7 天内可恢复。共享设备请及时清除。",
      );
    } catch {
      setMessage(
        "草稿未保存：请检查敏感凭据、输入长度或浏览器存储权限。不要把真实密钥写入草稿。",
      );
    }
  }
  function restoreDraft() {
    try {
      const text = localStorage.getItem(draftKey(scope));
      if (!text) {
        setMessage("当前表单没有本机草稿。");
        return;
      }
      const record = decodeDraft(text, scope, schema);
      if (
        dirty &&
        !window.confirm("恢复本机草稿会替换当前未提交输入，继续吗？")
      )
        return;
      restore(record.value);
      owned.current = { key: draftKey(scope), revision: record.revision };
      setMessage(
        "已恢复本机草稿，尚未提交。请先获取最新 GitHub 版本核对；不会自动提交。",
      );
    } catch {
      setMessage(
        "草稿已过期、损坏、含疑似凭据或不适用于当前表单，未恢复。可以清除后重新填写。",
      );
    }
  }
  function clearDraft() {
    try {
      localStorage.removeItem(draftKey(scope));
      owned.current = null;
      setMessage("已清除当前表单的本机草稿；当前输入和 GitHub 记录未改动。");
    } catch {
      setMessage("无法清除本机草稿，请检查浏览器存储权限。");
    }
  }
  function submitted() {
    // Never clear another tab's newer draft or an unrelated form.
    const reference = owned.current;
    if (reference) {
      try {
        const text = localStorage.getItem(reference.key);
        if (text && JSON.parse(text).revision === reference.revision)
          localStorage.removeItem(reference.key);
      } catch {
        /* A successful GitHub write does not depend on browser storage. */
      }
    }
    owned.current = null;
    setMessage("本次内容已提交到 GitHub；对应本机草稿已尝试清除。");
  }
  function updateOwnedDraft(value: T) {
    const reference = owned.current;
    if (!reference) return true;
    try {
      const text = localStorage.getItem(reference.key);
      if (!text || JSON.parse(text).revision !== reference.revision)
        return true;
      const record = encodeDraft(scope, value, schema);
      localStorage.setItem(reference.key, record.text);
      owned.current = { key: reference.key, revision: record.revision };
      return true;
    } catch {
      setMessage(
        "未能更新已保存草稿的答案锁定状态。请先清除该草稿，再展开答案。",
      );
      return false;
    }
  }
  return {
    message,
    saveDraft,
    restoreDraft,
    clearDraft,
    submitted,
    updateOwnedDraft,
    dirty,
  };
}
export function DraftControls({
  draft,
  disabled,
  label,
  restoreDisabled = false,
}: {
  draft: Pick<
    ReturnType<typeof useTrainingDraft>,
    "message" | "saveDraft" | "restoreDraft" | "clearDraft" | "dirty"
  >;
  disabled: boolean;
  label: string;
  restoreDisabled?: boolean;
}) {
  return (
    <div className={styles.draftTools} aria-label={label + "草稿工具"}>
      <p>{draft.dirty ? "未提交输入" : "当前没有新增未提交输入"}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className="secondary"
          disabled={disabled || !draft.dirty}
          onClick={draft.saveDraft}
        >
          保存本机草稿
        </button>
        <button
          type="button"
          className="secondary"
          disabled={disabled || restoreDisabled}
          onClick={draft.restoreDraft}
        >
          恢复本机草稿
        </button>
        <button
          type="button"
          className="secondary"
          disabled={disabled}
          onClick={draft.clearDraft}
        >
          清除本机草稿
        </button>
      </div>
      {draft.message && <p aria-live="polite">{draft.message}</p>}
    </div>
  );
}

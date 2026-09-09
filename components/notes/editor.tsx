"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/components/ui/markdown";
import { PublicNotice } from "@/components/ui/public-notice";
import { AssetUpload } from "./asset-upload";
import type { Entry } from "@/lib/schemas/content";
import type { Roadmap } from "@/lib/models";
export function Editor({
  entry,
  roadmap,
}: {
  entry?: Entry;
  roadmap: Roadmap;
}) {
  const router = useRouter();
  const key = "sdet-draft-note-" + (entry?.id || "new");
  const [title, setTitle] = useState(entry?.title || "");
  const [body, setBody] = useState(
    entry?.body ||
      "# 今日学习内容\n\n## 我的理解\n\n## 示例代码\n\n## 没搞懂的问题\n\n## 总结\n",
  );
  const [stageId, setStage] = useState(entry?.stageId || "stage-01");
  const [tags, setTags] = useState(entry?.tags.join(", ") || "");
  const [topics, setTopics] = useState(entry?.topicIds || []);
  const [duration, setDuration] = useState(entry?.durationMinutes || 0);
  const [status, setStatus] = useState(entry?.status || "in_progress");
  const [show, setShow] = useState(entry?.showInPortfolio || false);
  const [ack, setAck] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("editor");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            title,
            body,
            stageId,
            tags,
            topics,
            duration,
            status,
            show,
          }),
        );
      } catch {
        setMessage("本地草稿空间不足，请复制内容备份");
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [title, body, stageId, tags, topics, duration, status, show, key, dirty]);
  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(key) || "null");
      if (draft) {
        setTitle(draft.title);
        setBody(draft.body);
        setStage(draft.stageId);
        setTags(draft.tags);
        setTopics(draft.topics || []);
        setDuration(draft.duration || 0);
        setStatus(draft.status || "in_progress");
        setShow(!!draft.show);
        setDirty(true);
        setMessage("已恢复本机草稿，尚未提交");
      } else setMessage("没有本机草稿");
    } catch {
      setMessage("草稿无法读取");
    }
  }
  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(
        "/api/notes" + (entry ? "/" + entry.id : ""),
        {
          method: entry ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            body,
            stageId,
            tags: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            topicIds: topics,
            durationMinutes: duration,
            status,
            showInPortfolio: show,
            sha: entry?.sha,
            acknowledgedPublic: ack,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDirty(false);
      try {
        localStorage.removeItem(key);
      } catch {
        /* Saving to GitHub does not depend on browser storage. */
      }
      setMessage("已保存 · Commit: " + result.commit.slice(0, 7));
      if (!entry)
        router.push("/notes/" + result.id + "?saved=" + result.commit);
      else router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="note-studio">
      <div className="toolbar studio-toolbar">
        <h2>{entry ? "编辑笔记" : "新建笔记"}</h2>
        <span>{dirty ? "未提交草稿" : "与已载入版本一致"}</span>
        <button onClick={save} disabled={saving || !ack || !title.trim()}>
          {saving ? "正在提交…" : "保存并提交到 GitHub"}
        </button>
        <button type="button" onClick={restoreDraft} disabled={saving}>
          恢复本机草稿
        </button>
      </div>
      <fieldset
        disabled={saving}
        onChange={() => setDirty(true)}
        className="editor-form studio-grid"
      >
        <legend className="sr-only">笔记内容</legend>
        <div className="studio-metadata">
          <label>
            标题
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
            />
          </label>
          <div className="form-grid">
            <label>
              阶段
              <select
                value={stageId}
                onChange={(e) => {
                  setStage(e.target.value);
                  setTopics([]);
                }}
              >
                {roadmap.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              标签（逗号分隔）
              <input value={tags} onChange={(e) => setTags(e.target.value)} />
            </label>
            <label>
              笔记耗时（分钟，不计入总日课时长）
              <input
                type="number"
                min={0}
                max={1440}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
            <label>
              状态
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="planned">计划中</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </label>
          </div>
          <label>
            关联知识点
            <select
              multiple
              value={topics}
              onChange={(e) =>
                setTopics([...e.target.selectedOptions].map((o) => o.value))
              }
            >
              {roadmap.stages
                .find((s) => s.id === stageId)
                ?.groups.flatMap((g) => g.items)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
            />
            在作品集展示（不代表仓库中的数据私密）
          </label>
        </div>
        <div className="studio-writing">
          <div className="editor-tabs" role="group" aria-label="编辑器视图">
            <button type="button" onClick={() => setView("editor")}>
              编辑
            </button>
            <button type="button" onClick={() => setView("preview")}>
              预览
            </button>
          </div>
          <div className={"editor-split view-" + view}>
            <label className="editor-input">
              Markdown 正文
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={20}
              />
            </label>
            <div className="editor-preview">
              <h3>预览</h3>
              <Markdown body={body} />
            </div>
          </div>
        </div>
      </fieldset>
      <PublicNotice checked={ack} onChange={setAck} />
      <AssetUpload
        acknowledged={ack}
        disabled={saving}
        onInsert={(text) => {
          setBody((old) => old + "\n\n" + text);
          setDirty(true);
        }}
      />
      <div className="actions">
        <button className="ghost" onClick={() => location.reload()}>
          刷新远端版本
        </button>
        <button
          className="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(body);
              setMessage("已复制当前草稿");
            } catch {
              setMessage("复制失败，请在编辑框内手动全选复制");
            }
          }}
        >
          复制当前草稿
        </button>
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <small>本机草稿每 3.5 秒保存；GitHub 提交成功后才是长期存档。</small>
    </section>
  );
}

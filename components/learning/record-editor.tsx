"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/components/ui/markdown";
import { PublicNotice } from "@/components/ui/public-notice";
import { AssetUpload } from "@/components/notes/asset-upload";
import {
  templates,
  kindRoute,
  type ProjectDefinition,
} from "@/lib/content/catalog";
import type { Entry, Kind } from "@/lib/schemas/content";
import type { Roadmap } from "@/lib/models";
export function ProjectChecklist({
  items,
  onChange,
}: {
  items: { title: string; completed: boolean }[];
  onChange?: (items: { title: string; completed: boolean }[]) => void;
}) {
  return (
    <fieldset>
      <legend>项目验收清单</legend>
      {items.map((item, i) => (
        <label key={item.title} className="check-row">
          <input
            type="checkbox"
            checked={item.completed}
            disabled={!onChange}
            onChange={(e) =>
              onChange?.(
                items.map((v, j) =>
                  j === i ? { ...v, completed: e.target.checked } : v,
                ),
              )
            }
          />
          {item.title}
        </label>
      ))}
    </fieldset>
  );
}
export function RecordEditor({
  kind,
  entry,
  roadmap,
  projects,
  definition,
}: {
  kind: Exclude<Kind, "note">;
  entry?: Entry;
  roadmap: Roadmap;
  projects: ProjectDefinition[];
  definition?: ProjectDefinition;
}) {
  const router = useRouter();
  const initialProject =
    definition ||
    projects.find((p) => p.id === entry?.assignmentId) ||
    projects[0];
  const key =
    "sdet-draft-" + kind + "-" + (entry?.id || definition?.id || "new");
  const [form, setForm] = useState({
    title: entry?.title || definition?.title || "",
    body: entry?.body || templates[kind],
    stageId: entry?.stageId || initialProject?.stageId || "stage-01",
    tags: entry?.tags.join(", ") || "",
    topicIds: entry?.topicIds || [],
    status:
      entry?.status || (kind === "assignment" ? "submitted" : "in_progress"),
    showInPortfolio: entry?.showInPortfolio || false,
    assignmentId: entry?.assignmentId || initialProject?.id || "project-0",
    date: entry?.date || new Date().toISOString().slice(0, 10),
    plannedMinutes: entry?.plannedMinutes || 0,
    actualMinutes: entry?.actualMinutes || 0,
    durationMinutes: entry?.durationMinutes || 0,
    mood: entry?.mood || "",
    projectNo: entry?.projectNo ?? definition?.projectNo ?? 0,
    projectId: entry?.projectId || "",
    repositoryPath: entry?.repositoryPath || "",
    externalRepository: entry?.externalRepository || "",
    demoUrl: entry?.demoUrl || "",
    reportUrl: entry?.reportUrl || "",
    checklist: entry?.checklist.length
      ? entry.checklist
      : (definition?.checklist || []).map((title) => ({
          title,
          completed: false,
        })),
  });
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState("editor");
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(form));
      } catch {
        setMessage("本机草稿无法保存，请复制正文");
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [dirty, form, key]);
  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setDirty(true);
    setForm((f) => ({ ...f, [key]: value }));
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        projectId: form.projectId || undefined,
        sha: entry?.sha,
        acknowledgedPublic: ack,
      };
      const response = await fetch(
        "/api/" + kindRoute[kind] + (entry ? "/" + entry.id : ""),
        {
          method: entry ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDirty(false);
      try {
        localStorage.removeItem(key);
      } catch {
        /* GitHub remains the source of truth. */
      }
      setMessage("已保存 · Commit: " + data.commit.slice(0, 7));
      if (!entry)
        router.push(
          "/" + kindRoute[kind] + "/" + data.id + "?saved=" + data.commit,
        );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  const assignment = projects.find((p) => p.id === form.assignmentId);
  return (
    <section className="paper panel">
      <div className="toolbar">
        <h2>{entry ? "编辑记录" : "创建学习记录"}</h2>
        <button
          onClick={() => {
            try {
              const draft = localStorage.getItem(key);
              if (draft) {
                setForm(JSON.parse(draft));
                setDirty(true);
                setMessage("已恢复本机未提交草稿");
              } else setMessage("没有本机草稿");
            } catch {
              setMessage("草稿无法读取");
            }
          }}
        >
          恢复本机草稿
        </button>
      </div>
      <fieldset disabled={busy} className="editor-form">
        <legend className="sr-only">学习记录内容</legend>
        <label>
          标题
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            maxLength={160}
          />
        </label>
        {kind === "assignment" && (
          <>
            <label>
              作业
              <select
                value={form.assignmentId}
                disabled={!!entry}
                onChange={(e) => {
                  const p = projects.find((p) => p.id === e.target.value)!;
                  setForm((f) => ({
                    ...f,
                    assignmentId: p.id,
                    stageId: p.stageId,
                    topicIds: [],
                  }));
                  setDirty(true);
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <details>
              <summary>查看作业要求</summary>
              <Markdown body={assignment?.body || ""} />
            </details>
            <p>新建提交保留旧版本；当前迭代：{entry?.iteration || "新提交"}</p>
          </>
        )}
        {kind === "daily" && (
          <div className="form-grid">
            <label>
              日期（UTC）
              <input
                type="date"
                value={form.date}
                disabled={!!entry}
                onChange={(e) => update("date", e.target.value)}
              />
            </label>
            <label>
              心情（可选）
              <input
                value={form.mood}
                onChange={(e) => update("mood", e.target.value)}
              />
            </label>
            <label>
              预计时长（分钟）
              <input
                type="number"
                min={0}
                max={1440}
                value={form.plannedMinutes}
                onChange={(e) =>
                  update("plannedMinutes", Number(e.target.value))
                }
              />
            </label>
            <label>
              实际时长（分钟）
              <input
                type="number"
                min={0}
                max={1440}
                value={form.actualMinutes}
                onChange={(e) =>
                  update("actualMinutes", Number(e.target.value))
                }
              />
            </label>
          </div>
        )}
        <div className="form-grid">
          <label>
            阶段
            <select
              value={form.stageId}
              disabled={kind === "project" || kind === "assignment"}
              onChange={(e) => {
                update("stageId", e.target.value);
                update("topicIds", []);
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
            状态
            <select
              value={form.status}
              onChange={(e) =>
                update("status", e.target.value as typeof form.status)
              }
            >
              {[
                "planned",
                "in_progress",
                "submitted",
                "completed",
                "archived",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            标签（逗号分隔）
            <input
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
            />
          </label>
          {kind === "debug" && (
            <>
              <label>
                耗时（分钟）
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={form.durationMinutes}
                  onChange={(e) =>
                    update("durationMinutes", Number(e.target.value))
                  }
                />
              </label>
              <label>
                关联项目
                <select
                  value={form.projectId}
                  onChange={(e) => update("projectId", e.target.value)}
                >
                  <option value="">未关联</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <label>
          关联知识点
          <select
            multiple
            value={form.topicIds}
            onChange={(e) =>
              update(
                "topicIds",
                [...e.target.selectedOptions].map((o) => o.value),
              )
            }
          >
            {roadmap.stages
              .find((s) => s.id === form.stageId)
              ?.groups.flatMap((g) => g.items)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
          </select>
        </label>
        {kind === "project" && (
          <>
            <div className="form-grid">
              {(
                [
                  "repositoryPath",
                  "externalRepository",
                  "demoUrl",
                  "reportUrl",
                ] as const
              ).map((key, i) => (
                <label key={key}>
                  {
                    [
                      "仓库内代码路径（projects/）",
                      "外部 GitHub 仓库",
                      "演示链接（HTTPS）",
                      "报告 / CI 链接（HTTPS）",
                    ][i]
                  }
                  <input
                    value={form[key]}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <ProjectChecklist
              items={form.checklist}
              onChange={(v) => update("checklist", v)}
            />
          </>
        )}
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.showInPortfolio}
            onChange={(e) => update("showInPortfolio", e.target.checked)}
          />
          在作品集展示（仓库文件始终公开）
        </label>
        <div className="editor-tabs">
          <button onClick={() => setView("editor")}>编辑</button>
          <button onClick={() => setView("preview")}>预览</button>
        </div>
        <div className={"editor-split view-" + view}>
          <label className="editor-input">
            Markdown 正文
            <textarea
              rows={20}
              value={form.body}
              onChange={(e) => update("body", e.target.value)}
            />
          </label>
          <div className="editor-preview">
            <h3>预览</h3>
            <Markdown body={form.body} />
          </div>
        </div>
      </fieldset>
      <PublicNotice checked={ack} onChange={setAck} />
      <AssetUpload
        acknowledged={ack}
        disabled={busy}
        onInsert={(text) => {
          setForm((current) => ({
            ...current,
            body: current.body + "\n\n" + text,
          }));
          setDirty(true);
        }}
      />
      <div className="actions">
        <button disabled={!ack || busy || !form.title.trim()} onClick={save}>
          {busy ? "正在提交…" : "保存并提交到 GitHub"}
        </button>
        <button onClick={() => location.reload()}>刷新远端版本</button>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(form.body);
              setMessage("已复制当前草稿");
            } catch {
              setMessage("请手动复制编辑框正文");
            }
          }}
        >
          复制当前草稿
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}

"use client";
import { useState } from "react";
export function AssetUpload({
  acknowledged,
  disabled = false,
  onInsert,
}: {
  acknowledged: boolean;
  disabled?: boolean;
  onInsert: (markdown: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("acknowledgedPublic", String(acknowledged));
      const r = await fetch("/api/assets", { method: "POST", body: form });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      onInsert((data.image ? "!" : "") + "[附件](" + data.url + ")");
      setFile(null);
      setMessage(
        "附件已提交 · Commit: " +
          data.commit.slice(0, 7) +
          "；请保存正文中的引用。",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "附件上传失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="attachment">
      <summary>上传附件到 GitHub（≤ 4 MB）</summary>
      <p>
        附件上传立即生成公开提交。支持图片、PDF、Markdown、文本、JSON、YAML、CSV
        和 JMX；不支持 ZIP。请先检查敏感信息。
      </p>
      <label>
        选择附件
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.md,.txt,.json,.yaml,.yml,.csv,.jmx"
          disabled={disabled || busy}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>
      <button
        disabled={!file || !acknowledged || disabled || busy}
        onClick={upload}
      >
        {busy ? "正在上传…" : "上传并插入引用"}
      </button>
      <p role="status">{message}</p>
    </details>
  );
}

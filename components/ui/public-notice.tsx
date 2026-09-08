"use client";
export function PublicNotice({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="public-notice">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        当前仓库为公开仓库，提交到 GitHub
        的笔记、作业与项目记录可能被公开访问，请勿写入密码、Token、身份证号、私人账号等敏感信息。
      </span>
    </label>
  );
}

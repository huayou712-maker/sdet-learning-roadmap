export default function Loading() {
  return (
    <div
      className="loading-workspace"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p>正在读取 GitHub 学习记录…</p>
      <div className="loading-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

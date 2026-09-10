import { StatePanel } from "@/components/ui/state-panel";
export default function Loading() {
  return (
    <div
      className="loading-workspace"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <StatePanel kind="loading" title="正在读取 GitHub 学习记录…">
        <p>学习内容就绪后会显示在这里；等待期间仍可使用顶部导航。</p>
      </StatePanel>
    </div>
  );
}

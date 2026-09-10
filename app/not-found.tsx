import Link from "next/link";
import { StatePanel } from "@/components/ui/state-panel";
export default function NotFound() {
  return (
    <StatePanel
      kind="missing"
      title="这份记录不在这里"
      actions={
        <>
          <Link className="button" href="/">
            返回学习首页
          </Link>
          <Link href="/notes">浏览可见笔记 →</Link>
        </>
      }
    >
      <p>记录不存在、已移入回收站，或未选择公开展示。</p>
      <p>先核对地址，或从学习首页重新进入对应的内容。</p>
    </StatePanel>
  );
}

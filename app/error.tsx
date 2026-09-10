"use client";
import Link from "next/link";
import { StatePanel } from "@/components/ui/state-panel";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <StatePanel
      kind="error"
      title="学习档案暂时无法读取"
      actions={
        <>
          <button type="button" onClick={retry}>
            重新读取
          </button>
          <Link href="/settings">检查连接设置 →</Link>
          <Link href="/">返回学习首页</Link>
        </>
      }
    >
      <p>
        可能是网络、GitHub
        权限或目标分支暂时不可用。可以重新读取，或先检查连接设置。
      </p>
      <p>
        如果刚提交过内容，恢复后先核对 GitHub 提交历史，再决定是否重新提交。
      </p>
      <p>
        未提交输入可能仅保存在页面内存中；重试或离开页面前，请先备份仍能访问的内容。
      </p>
    </StatePanel>
  );
}

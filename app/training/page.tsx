import Link from "next/link";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { repository } from "@/lib/github/contents";
import { readEntries, readLearning } from "@/lib/content/read";
import { readTraining } from "@/lib/training/service";
import { TrainingWorkspace } from "@/components/training/workspace";
import { StatePanel } from "@/components/ui/state-panel";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; source?: string; card?: string }>;
}) {
  if (!isOwner(await identity()))
    return (
      <>
        <header className="page-heading">
          <h1>个人训练台</h1>
          <p>独立练习、复习与今日任务。</p>
        </header>
        <StatePanel
          compact
          kind="restricted"
          title="登录所有者账户后使用训练台"
          actions={
            <>
              <Link href="/settings">前往设置检查 GitHub 登录</Link>
              <Link href="/guide/beginner">先阅读公开实践指南 →</Link>
            </>
          }
        >
          <p>
            训练详情仅向所有者开放。公开仓库文件仍可见，此限制不代表数据私密。
          </p>
        </StatePanel>
      </>
    );
  const [snapshot, records, learning, query] = await Promise.all([
    readTraining(repository()),
    readEntries(),
    readLearning(),
    searchParams,
  ]);
  const sources = records
    .filter((r) => r.type === "note" || r.type === "debug")
    .map(({ id, type, title, deletedAt, sha }) => ({
      id,
      type,
      title,
      deletedAt,
      sha,
    }));
  return (
    <TrainingWorkspace
      initial={snapshot}
      sources={sources}
      roadmap={learning.roadmap}
      progress={learning.progress}
      tab={query.tab || "today"}
      sourceId={query.source || ""}
      cardId={query.card || ""}
      today={new Date().toISOString().slice(0, 10)}
    />
  );
}

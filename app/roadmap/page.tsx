import { Checklist } from "@/components/roadmap/checklist";
import { readLearning, readEntries } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; status?: string }>;
}) {
  const data = await readLearning();
  const owner = isOwner(await identity());
  const entries = (await readEntries()).filter(
    (e) => !e.deletedAt && (owner || e.showInPortfolio),
  );
  const query = await searchParams;
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">THE LEARNING PATH</p>
        <h1>十阶进路</h1>
        <p>学习路线定义来自原始文档，完成状态独立保存。</p>
      </div>
      <Checklist
        {...data}
        owner={owner}
        initialStage={query.stage}
        initialFilter={query.status}
        entries={entries.map(({ id, type, title, stageId }) => ({
          id,
          type,
          title,
          stageId,
        }))}
      />
    </>
  );
}

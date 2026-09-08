import { Checklist } from "@/components/roadmap/checklist";
import { readLearning, readEntries } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
export default async function Page() {
  const data = await readLearning();
  const owner = isOwner(await identity());
  const entries = (await readEntries()).filter(
    (e) => !e.deletedAt && (owner || e.showInPortfolio),
  );
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
        entries={entries.map(({ id, type, title }) => ({ id, type, title }))}
      />
    </>
  );
}

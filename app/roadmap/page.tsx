import { Checklist } from "@/components/roadmap/checklist";
import { readLearning } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
export default async function Page() {
  const data = await readLearning();
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">THE LEARNING PATH</p>
        <h1>十阶进路</h1>
        <p>学习路线定义来自原始文档，完成状态独立保存。</p>
      </div>
      <Checklist {...data} owner={isOwner(await identity())} />
    </>
  );
}

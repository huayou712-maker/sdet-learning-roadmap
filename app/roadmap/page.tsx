import roadmap from "@/data/roadmap.json";
import progress from "@/data/progress.json";
import type { Progress } from "@/lib/models";
import { Checklist } from "@/components/roadmap/checklist";
export default function Page() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">THE LEARNING PATH</p>
        <h1>十阶进路</h1>
        <p>学习路线定义来自原始文档，完成状态独立保存。</p>
      </div>
      <Checklist roadmap={roadmap} progress={progress as Progress} />
    </>
  );
}

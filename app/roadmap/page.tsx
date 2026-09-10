import Link from "next/link";
import { Checklist } from "@/components/roadmap/checklist";
import { readLearning, readEntries } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import {
  connectionsForTasks,
  learningEntriesForViewer,
  publicLearningProgress,
} from "@/lib/content/learning-connections";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; status?: string }>;
}) {
  const data = await readLearning();
  const owner = isOwner(await identity());
  const entries = learningEntriesForViewer(await readEntries(), owner);
  const displayProgress = owner
    ? data.progress
    : publicLearningProgress(data.progress, entries);
  const connections = connectionsForTasks(
    data.roadmap,
    data.progress,
    entries,
    owner,
  );
  const query = await searchParams;
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">THE LEARNING PATH</p>
        <h1>{query.stage ? "十阶段参考目录" : "功法长卷"}</h1>
        <p>
          先按实践主线推进，十阶段目录随用随查。课程与正式进度均以 GitHub 为准。
        </p>
        {query.stage && <Link href="/roadmap">← 返回六站实践主线</Link>}
      </div>
      <Checklist
        {...data}
        progress={displayProgress}
        connections={connections}
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

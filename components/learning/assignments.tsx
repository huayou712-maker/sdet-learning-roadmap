import Link from "next/link";
import type { Entry } from "@/lib/schemas/content";
import type { ProjectDefinition } from "@/lib/content/catalog";
import { Markdown } from "@/components/ui/markdown";
import { statusLabel } from "@/lib/dashboard";
import { ResponsivePanel } from "@/components/ui/responsive-panel";
export function AssignmentList({
  entries,
  projects,
  owner,
  query,
}: {
  entries: Entry[];
  projects: ProjectDefinition[];
  owner: boolean;
  query: Record<string, string | undefined>;
}) {
  const { stage = "", status = "" } = query;
  const rows = entries.filter(
    (e) => (!stage || e.stageId === stage) && (!status || e.status === status),
  );
  return (
    <>
      <nav className="status-tabs" aria-label="作业状态">
        {[
          ["", "全部"],
          ["in_progress", "进行中"],
          ["submitted", "已提交"],
          ["completed", "已完成"],
        ].map(([s, label]) => (
          <Link
            key={s}
            href={"/assignments?" + new URLSearchParams({ stage, status: s })}
            aria-current={status === s ? "page" : undefined}
          >
            {label}{" "}
            <strong>
              {entries.filter((e) => !s || e.status === s).length}
            </strong>
          </Link>
        ))}
      </nav>
      <ResponsivePanel title="筛选作业" side="bottom">
        <details className="filter-sheet" open>
          <summary>筛选作业</summary>
          <form className="toolbar">
            <label>
              阶段
              <select name="stage" defaultValue={stage}>
                <option value="">全部</option>
                {Array.from(new Set(projects.map((p) => p.stageId))).map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              状态
              <select name="status" defaultValue={status}>
                <option value="">全部</option>
                {Object.entries(statusLabel).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary">筛选</button>
          </form>
        </details>
      </ResponsivePanel>
      <table className="submission-table">
        <caption className="sr-only">作业提交记录</caption>
        <thead>
          <tr>
            {[
              "作业",
              "Stage",
              "状态",
              "Submission",
              "最后更新",
              "关联项目",
              "操作",
            ].map((t) => (
              <th key={t} scope="col">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id}>
              <td data-label="作业">
                <Link href={"/assignments/" + e.id}>{e.title}</Link>
              </td>
              <td data-label="Stage">{e.stageId}</td>
              <td data-label="状态">{statusLabel[e.status]}</td>
              <td data-label="Submission">#{e.iteration}</td>
              <td data-label="最后更新">{e.updatedAt.slice(0, 10)}</td>
              <td data-label="关联项目">
                <Link href={"/projects/" + e.assignmentId}>
                  {projects.find((p) => p.id === e.assignmentId)?.title ||
                    e.assignmentId}
                </Link>
              </td>
              <td data-label="操作">
                <Link href={"/assignments/" + e.id}>查看</Link>
                {owner && (
                  <>
                    {" "}
                    ·{" "}
                    <Link
                      href={"/assignments/new?assignment=" + e.assignmentId}
                    >
                      新迭代
                    </Link>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="empty">
          暂无匹配提交。{owner ? "开始一次作业，将过程与结果独立留档。" : ""}
        </p>
      )}
      {owner && (
        <Link className="button secondary" href="/assignments/new">
          开始 / 提交作业
        </Link>
      )}
    </>
  );
}
export function AssignmentDetail({
  entry,
  entries,
  definition,
  owner,
}: {
  entry: Entry;
  entries: Entry[];
  definition?: ProjectDefinition;
  owner: boolean;
}) {
  const versions = entries
    .filter((e) => e.assignmentId === entry.assignmentId)
    .sort((a, b) => (b.iteration || 0) - (a.iteration || 0));
  return (
    <div className="detail-workspace">
      <article>
        <section>
          <h2>作业要求</h2>
          <Markdown body={definition?.body || "暂无关联要求。"} />
        </section>
        <section>
          <h2>提交内容与反思</h2>
          <Markdown body={entry.body} />
        </section>
        <section>
          <h2>Submission History</h2>
          <ol className="version-timeline">
            {versions.map((e) => (
              <li key={e.id}>
                <Link href={"/assignments/" + e.id}>
                  Submission #{e.iteration} · {e.title}
                </Link>
                <p>
                  {e.updatedAt.slice(0, 10)} · {statusLabel[e.status]}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </article>
      <aside className="detail-metadata">
        <h2>本次提交</h2>
        <dl>
          <dt>状态</dt>
          <dd>{statusLabel[entry.status]}</dd>
          <dt>Stage</dt>
          <dd>{entry.stageId}</dd>
          <dt>开始</dt>
          <dd>{entry.startedAt?.slice(0, 10) || "尚无记录"}</dd>
          <dt>提交</dt>
          <dd>{entry.submittedAt?.slice(0, 10) || "尚未提交"}</dd>
          <dt>当前迭代</dt>
          <dd>当前迭代：{entry.iteration}</dd>
        </dl>
        <Link href={"/projects/" + entry.assignmentId}>关联项目 →</Link>
        {owner && !entry.deletedAt && (
          <div className="actions">
            <Link
              className="button secondary"
              href={"/assignments/" + entry.id + "?edit=1"}
            >
              编辑记录
            </Link>
            <Link
              className="button"
              href={"/assignments/new?assignment=" + entry.assignmentId}
            >
              新迭代
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}

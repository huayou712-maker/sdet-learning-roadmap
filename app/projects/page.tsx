import Link from "next/link";
import { readProjects, readEntries } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { Thumbnail } from "@/components/dashboard/media";
import { statusLabel } from "@/lib/dashboard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const owner = isOwner(await identity());
  const projects = await readProjects();
  const entries = await readEntries();
  const { status = "" } = await searchParams;
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">BUILD SOMETHING REAL</p>
        <h1>项目档案</h1>
        <p>从测试用例，到可复现的质量工程。</p>
      </div>
      <nav className="status-tabs" aria-label="项目状态">
        {[
          ["", "全部"],
          ["planned", "计划中"],
          ["in_progress", "进行中"],
          ["completed", "已完成"],
        ].map(([s, label]) => (
          <Link
            key={s}
            href={"/projects?status=" + s}
            aria-current={status === s ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="project-grid workspace-projects">
        {projects
          .filter(
            (p) =>
              !status ||
              (entries.find(
                (e) =>
                  e.type === "project" &&
                  e.id === p.id &&
                  !e.deletedAt &&
                  (owner || e.showInPortfolio),
              )?.status || "planned") === status,
          )
          .map((p, i) => {
            const e = entries.find(
              (e) =>
                e.id === p.id && !e.deletedAt && (owner || e.showInPortfolio),
            );
            return (
              <Link
                className="paper panel project-tile"
                key={p.id}
                href={"/projects/" + p.id}
              >
                <Thumbnail kind="project" index={i} />
                <small>PROJECT {p.projectNo}</small>
                <h2>{p.title}</h2>
                <progress
                  aria-label={p.title + " 验收进度"}
                  max={p.checklist.length || 1}
                  value={e?.checklist.filter((c) => c.completed).length || 0}
                />
                <p>
                  {e?.checklist.filter((c) => c.completed).length || 0} /{" "}
                  {p.checklist.length} 项验收
                </p>
                <span className="badge">
                  {statusLabel[e?.status || "planned"]}
                </span>
                <p>{e?.tags.join(" / ")}</p>
                {e && <small>更新 {e.updatedAt.slice(0, 10)}</small>}
              </Link>
            );
          })}
      </div>
    </>
  );
}

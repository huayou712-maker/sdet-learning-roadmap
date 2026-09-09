import Link from "next/link";
import { notFound } from "next/navigation";
import { readProjects, readEntries, readLearning } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { Markdown } from "@/components/ui/markdown";
import {
  RecordEditor,
  ProjectChecklist,
} from "@/components/learning/record-editor";
import { ContentActions, History } from "@/components/notes/actions";
import { entryUrl } from "@/lib/content/catalog";
import { statusLabel } from "@/lib/dashboard";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; tab?: string; edit?: string }>;
}) {
  const { id } = await params;
  const projects = await readProjects();
  const definition = projects.find((p) => p.id === id);
  if (!definition) notFound();
  const owner = isOwner(await identity());
  const all = (await readEntries()).filter(
    (e) => owner || (!e.deletedAt && e.showInPortfolio),
  );
  const entry = all.find((e) => e.type === "project" && e.id === id);
  const { saved, tab = "overview", edit } = await searchParams;
  const related = all.filter(
    (e) =>
      !e.deletedAt &&
      (e.projectId === id ||
        (e.type === "note" && e.stageId === definition.stageId)),
  );
  const checks = definition.checklist.map((title) => ({
    title,
    completed: !!entry?.checklist.find((c) => c.title === title)?.completed,
  }));
  return (
    <>
      <header className="page-heading section-head">
        <div>
          <p className="eyebrow">PROJECT {definition.projectNo} / WORKSPACE</p>
          <h1>{definition.title}</h1>
          <p>
            {statusLabel[entry?.status || "planned"]} · {definition.stageId}
          </p>
        </div>
        {owner && !entry?.deletedAt && (
          <Link
            className="button secondary"
            href={"/projects/" + id + "?edit=1"}
          >
            编辑项目
          </Link>
        )}
      </header>
      {saved && /^[a-f0-9]{40}$/.test(saved) && (
        <p role="status">已保存 · Commit: {saved.slice(0, 7)}</p>
      )}
      {edit === "1" && owner && !entry?.deletedAt ? (
        <RecordEditor
          kind="project"
          entry={entry}
          definition={definition}
          projects={projects}
          roadmap={(await readLearning()).roadmap}
        />
      ) : (
        <>
          <div className="project-summary">
            <p>
              验收 {checks.filter((c) => c.completed).length}/{checks.length}
            </p>
            <progress
              aria-label="项目验收进度"
              max={checks.length || 1}
              value={checks.filter((c) => c.completed).length}
            />
            <p>{entry?.tags.join(" / ")}</p>
            {entry?.externalRepository && (
              <a href={entry.externalRepository}>代码仓库 ↗</a>
            )}
            {entry?.reportUrl && <a href={entry.reportUrl}>报告 / CI ↗</a>}
          </div>
          <nav className="status-tabs" aria-label="项目工作区">
            {[
              ["overview", "Overview"],
              ["checklist", "Checklist"],
              ["notes", "Notes"],
              ["debug", "Debug"],
              ["reports", "Reports"],
              ["history", "History"],
            ].map(([key, label]) => (
              <Link
                key={key}
                href={"/projects/" + id + "?tab=" + key}
                aria-current={tab === key ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="project-document">
            {tab === "overview" && (
              <>
                <h2>项目说明</h2>
                {entry && !entry.deletedAt ? (
                  <Markdown body={entry.body} />
                ) : (
                  <p>项目成果尚未公开展示。</p>
                )}
                <details>
                  <summary>原始项目要求</summary>
                  <Markdown body={definition.body} />
                </details>
              </>
            )}
            {tab === "checklist" && (
              <>
                <ProjectChecklist items={checks} />
                {owner && !entry?.deletedAt && (
                  <Link
                    className="button secondary"
                    href={"/projects/" + id + "?edit=1"}
                  >
                    更新验收清单
                  </Link>
                )}
              </>
            )}
            {(tab === "notes" || tab === "debug") && (
              <>
                <h2>{tab === "notes" ? "关联笔记" : "排障案例"}</h2>
                <ul className="related-list">
                  {related
                    .filter(
                      (e) => e.type === (tab === "notes" ? "note" : "debug"),
                    )
                    .map((e) => (
                      <li key={e.id}>
                        <Link href={entryUrl(e)}>{e.title}</Link>
                      </li>
                    ))}
                </ul>
                {!related.some(
                  (e) => e.type === (tab === "notes" ? "note" : "debug"),
                ) && <p>暂无关联记录。</p>}
              </>
            )}
            {tab === "reports" && (
              <>
                <h2>报告与演示</h2>
                {entry?.reportUrl ? (
                  <p>
                    <a href={entry.reportUrl}>测试报告 / CI ↗</a>
                  </p>
                ) : (
                  <p>尚未提供报告链接。</p>
                )}
                {entry?.demoUrl && <a href={entry.demoUrl}>在线演示 ↗</a>}
                {entry?.repositoryPath && (
                  <p>仓库内代码：{entry.repositoryPath}</p>
                )}
              </>
            )}
            {tab === "history" &&
              (entry ? (
                <History id={id} kind="projects" />
              ) : (
                <p>尚无项目成果提交历史。</p>
              ))}
          </div>
        </>
      )}
      {entry && owner && (
        <ContentActions
          id={id}
          sha={entry.sha}
          kind="projects"
          trashed={!!entry.deletedAt}
        />
      )}
    </>
  );
}

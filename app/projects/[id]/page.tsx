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
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const projects = await readProjects();
  const definition = projects.find((p) => p.id === id);
  if (!definition) notFound();
  const owner = isOwner(await identity());
  const all = await readEntries();
  const entry = all.find(
    (e) => e.id === id && e.type === "project" && (owner || e.showInPortfolio),
  );
  const { saved } = await searchParams;
  const related = all.filter(
    (e) =>
      !e.deletedAt &&
      (owner || e.showInPortfolio) &&
      (e.projectId === id ||
        (e.type === "note" && e.stageId === definition.stageId)),
  );
  return (
    <>
      <div className="page-heading">
        <h1>{definition.title}</h1>
        <p>
          {entry?.status || "planned"} · Project {definition.projectNo}
        </p>
        {saved && /^[a-f0-9]{40}$/.test(saved) && (
          <p role="status">已保存 · Commit: {saved.slice(0, 7)}</p>
        )}
      </div>
      <details className="paper panel">
        <summary>原始项目要求</summary>
        <Markdown body={definition.body} />
      </details>
      {owner && !entry?.deletedAt ? (
        <RecordEditor
          kind="project"
          entry={entry}
          definition={definition}
          projects={projects}
          roadmap={(await readLearning()).roadmap}
        />
      ) : entry && !entry.deletedAt ? (
        <article className="paper panel">
          <ProjectChecklist items={entry.checklist} />
          <Markdown body={entry.body} />
          <div className="actions">
            {entry.externalRepository && (
              <a href={entry.externalRepository}>代码仓库 ↗</a>
            )}
            {entry.demoUrl && <a href={entry.demoUrl}>在线演示 ↗</a>}
            {entry.reportUrl && <a href={entry.reportUrl}>测试报告 / CI ↗</a>}
          </div>
        </article>
      ) : (
        <p className="empty">项目成果尚未公开展示。</p>
      )}
      {entry && (
        <>
          {owner && (
            <ContentActions
              id={entry.id}
              sha={entry.sha}
              kind="projects"
              trashed={!!entry.deletedAt}
            />
          )}
          <History id={entry.id} kind="projects" />
        </>
      )}
      <section className="paper panel">
        <h2>关联笔记与排障</h2>
        {related.map((e) => (
          <p key={e.id}>
            <Link href={entryUrl(e)}>{e.title} ↗</Link>
          </p>
        ))}
        {!related.length && <p>暂无关联证据。</p>}
      </section>
    </>
  );
}

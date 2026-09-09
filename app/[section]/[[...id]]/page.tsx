import Link from "next/link";
import { notFound } from "next/navigation";
import { readEntries, readLearning, readProjects } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { sections, entryUrl } from "@/lib/content/catalog";
import { RecordEditor } from "@/components/learning/record-editor";
import { Markdown } from "@/components/ui/markdown";
import { ContentActions, History } from "@/components/notes/actions";
import {
  AssignmentList,
  AssignmentDetail,
} from "@/components/learning/assignments";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; id?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { section, id = [] } = await params;
  const config = sections[section];
  if (!config || id.length > 1) notFound();
  const owner = isOwner(await identity());
  const all = await readEntries();
  const entry =
    id[0] && id[0] !== "new"
      ? all.find((e) => e.id === id[0] && e.type === config.kind)
      : undefined;
  if (
    id[0] &&
    id[0] !== "new" &&
    (!entry || (!owner && (!entry.showInPortfolio || entry.deletedAt)))
  )
    notFound();
  const query = await searchParams;
  const { saved, edit } = query;
  const visible = all.filter(
    (e) =>
      e.type === config.kind && !e.deletedAt && (owner || e.showInPortfolio),
  );
  const projects = await readProjects();
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">LEARNING ARCHIVE</p>
        <h1>{entry?.title || config.title}</h1>
        <p>{config.description}</p>
        {saved && /^[a-f0-9]{40}$/.test(saved) && (
          <p role="status">已保存 · Commit: {saved.slice(0, 7)}</p>
        )}
        {!id.length && owner && (
          <Link className="button" href={"/" + section + "/new"}>
            新建记录
          </Link>
        )}
      </div>
      {section === "assignments" && !id.length ? (
        <AssignmentList
          entries={visible}
          projects={projects}
          owner={owner}
          query={query}
        />
      ) : section === "assignments" && entry && edit !== "1" ? (
        <AssignmentDetail
          entry={entry}
          entries={visible}
          definition={projects.find((p) => p.id === entry.assignmentId)}
          owner={owner}
        />
      ) : id.length ? (
        owner && !entry?.deletedAt ? (
          <RecordEditor
            kind={config.kind as "assignment" | "debug" | "daily"}
            entry={entry}
            roadmap={(await readLearning()).roadmap}
            projects={projects}
            initialAssignment={query.assignment}
          />
        ) : entry ? (
          <article className="paper panel">
            <Markdown body={entry.body} />
          </article>
        ) : (
          <p>仅所有者可新建记录。</p>
        )
      ) : (
        <div>
          {all
            .filter(
              (e) =>
                e.type === config.kind &&
                !e.deletedAt &&
                (owner || e.showInPortfolio),
            )
            .map((e) => (
              <Link
                className="paper panel entry-card"
                key={e.id}
                href={entryUrl(e)}
              >
                <small>
                  {e.date || e.updatedAt.slice(0, 10)}{" "}
                  {e.iteration ? "· Submission #" + e.iteration : ""}
                </small>
                <h2>{e.title}</h2>
                <p>{e.body.slice(0, 140)}</p>
              </Link>
            ))}
          {!all.some(
            (e) =>
              e.type === config.kind &&
              !e.deletedAt &&
              (owner || e.showInPortfolio),
          ) && <p className="empty">暂无可展示记录。</p>}
        </div>
      )}
      {entry && (
        <>
          {owner && (
            <ContentActions
              id={entry.id}
              sha={entry.sha}
              trashed={!!entry.deletedAt}
              kind={section}
            />
          )}
          <History id={entry.id} kind={section} />
        </>
      )}
    </>
  );
}

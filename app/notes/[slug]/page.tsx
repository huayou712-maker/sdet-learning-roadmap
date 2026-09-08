import { notFound } from "next/navigation";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { readLearning, readEntries } from "@/lib/content/read";
import { Editor } from "@/components/notes/editor";
import { ContentActions, History } from "@/components/notes/actions";
import { Markdown } from "@/components/ui/markdown";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { slug } = await params;
  const owner = isOwner(await identity());
  const entry = (await readEntries()).find((e) => e.id === slug);
  if (!entry || (!owner && (entry.deletedAt || !entry.showInPortfolio)))
    notFound();
  const { saved } = await searchParams;
  return (
    <>
      <div className="page-heading">
        <h1>{entry.title}</h1>
        {saved && /^[a-f0-9]{40}$/.test(saved) && (
          <p role="status">已保存 · Commit: {saved.slice(0, 7)}</p>
        )}
      </div>
      {owner && !entry.deletedAt ? (
        <Editor entry={entry} roadmap={(await readLearning()).roadmap} />
      ) : (
        <article className="paper panel">
          <Markdown body={entry.body} />
        </article>
      )}
      {owner && (
        <ContentActions
          id={entry.id}
          sha={entry.sha}
          trashed={!!entry.deletedAt}
        />
      )}
      <History id={entry.id} />
    </>
  );
}

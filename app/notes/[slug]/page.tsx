import Link from "next/link";
import { notFound } from "next/navigation";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { readLearning, readEntries } from "@/lib/content/read";
import { Editor } from "@/components/notes/editor";
import { ContentActions, History } from "@/components/notes/actions";
import { Markdown } from "@/components/ui/markdown";
import { documentSections } from "@/lib/presentation";
import { ResponsivePanel } from "@/components/ui/responsive-panel";
import { FocusReader } from "@/components/notes/focus-reader";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; edit?: string }>;
}) {
  const { slug } = await params;
  const owner = isOwner(await identity());
  const all = await readEntries();
  const entry = all.find((e) => e.id === slug && e.type === "note");
  if (!entry || (!owner && (entry.deletedAt || !entry.showInPortfolio)))
    notFound();
  const { saved, edit } = await searchParams;
  const { roadmap, progress } = await readLearning();
  const sections = documentSections(entry.body);
  const related = all
    .filter(
      (e) =>
        e.type === "note" &&
        e.id !== entry.id &&
        !e.deletedAt &&
        (owner || e.showInPortfolio) &&
        e.stageId === entry.stageId,
    )
    .slice(0, 5);
  return (
    <>
      {saved && /^[a-f0-9]{40}$/.test(saved) && (
        <p role="status">已保存 · Commit: {saved.slice(0, 7)}</p>
      )}
      {owner && !entry.deletedAt && edit === "1" ? (
        <>
          <header className="page-heading">
            <Link href={"/notes/" + slug}>← 返回阅读</Link>
            <h1>{entry.title}</h1>
          </header>
          <Editor entry={entry} roadmap={roadmap} />
        </>
      ) : (
        <FocusReader key={entry.id}>
          <div className="reading-layout">
            <nav className="reading-nav" aria-label="文档导航">
              <Link href="/notes">← 知识库</Link>
              <Link href={"/roadmap?stage=" + entry.stageId}>学习阶段</Link>
              {owner && !entry.deletedAt && (
                <Link
                  className="button secondary"
                  href={"/notes/" + slug + "?edit=1"}
                >
                  编辑笔记
                </Link>
              )}
              <a href="#note-history">历史</a>
              {owner && !entry.deletedAt && (
                <Link href={"/training?tab=review&source=" + entry.id}>
                  加入复习 →
                </Link>
              )}
            </nav>
            <article className="reading-article">
              <header className="page-heading">
                <p className="eyebrow">KNOWLEDGE DOCUMENT</p>
                <h1>{entry.title}</h1>
                <p>
                  {entry.stageId} · {entry.tags.join(" / ")}
                </p>
                <small>
                  创建 {entry.createdAt.slice(0, 10)} · 更新{" "}
                  {entry.updatedAt.slice(0, 10)}
                </small>
              </header>
              <Markdown body={entry.body} anchors />
              <section>
                <h2>关联证据</h2>
                <ul>
                  {roadmap.stages
                    .flatMap((s) => s.groups.flatMap((g) => g.items))
                    .filter((i) =>
                      progress.items[i.id]?.evidence.some(
                        (e) => e.type === "note" && e.id === entry.id,
                      ),
                    )
                    .map((i) => (
                      <li key={i.id}>
                        <Link href={"/roadmap?stage=" + entry.stageId}>
                          {i.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            </article>
            <aside className="reading-aside">
              <ResponsivePanel title="目录与元信息" side="bottom">
                <details open>
                  <summary>目录与元信息</summary>
                  <nav aria-label="文章目录">
                    {sections.map((s) => (
                      <a key={s.id} href={"#" + s.id}>
                        {s.title}
                      </a>
                    ))}
                  </nav>
                  <p>
                    {entry.durationMinutes} 分钟 · {entry.status}
                  </p>
                </details>
                <h3>相关笔记</h3>
                {related.map((e) => (
                  <p key={e.id}>
                    <Link href={"/notes/" + e.id}>{e.title}</Link>
                  </p>
                ))}
                {!related.length && <p>暂无相关笔记。</p>}
              </ResponsivePanel>
            </aside>
          </div>
        </FocusReader>
      )}
      <div className="document-actions">
        {owner && (
          <ContentActions
            id={entry.id}
            sha={entry.sha}
            trashed={!!entry.deletedAt}
          />
        )}
        <div id="note-history">
          <History id={entry.id} />
        </div>
      </div>
    </>
  );
}

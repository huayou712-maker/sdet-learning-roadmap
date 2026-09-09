import Link from "next/link";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { readEntries, readLearning } from "@/lib/content/read";
import { Thumbnail } from "@/components/dashboard/media";
import { excerpt, statusLabel } from "@/lib/dashboard";
import { ResponsivePanel } from "@/components/ui/responsive-panel";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const owner = isOwner(await identity());
  const { roadmap, progress } = await readLearning();
  const query = await searchParams;
  const {
    q = "",
    stage = "",
    tag = "",
    topic = "",
    status = "",
    view = "list",
  } = query;
  const all = (await readEntries()).filter(
    (e) => e.type === "note" && !e.deletedAt && (owner || e.showInPortfolio),
  );
  const entries = all.filter(
    (e) =>
      (!stage || e.stageId === stage) &&
      (!tag || e.tags.includes(tag)) &&
      (!topic || e.topicIds.includes(topic)) &&
      (!status || e.status === status) &&
      (e.title + " " + e.body + " " + e.tags.join(" "))
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const url = (change: Record<string, string>) =>
    "/notes?" +
    new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(query).filter(
          (p): p is [string, string] => typeof p[1] === "string",
        ),
      ),
      ...change,
    });
  return (
    <>
      <header className="page-heading section-head">
        <div>
          <p className="eyebrow">KNOWLEDGE LIBRARY</p>
          <h1>学习笔记</h1>
          <p>{all.length} 篇知识文档 · 从理解到证据</p>
        </div>
        {owner && (
          <Link className="button" href="/notes/new">
            新建笔记
          </Link>
        )}
      </header>
      <div className="knowledge-layout">
        <ResponsivePanel title="知识目录">
          <details className="knowledge-sidebar" open>
            <summary>知识目录</summary>
            <nav aria-label="笔记知识目录">
              <Link
                href="/notes"
                aria-current={!stage && !tag ? "page" : undefined}
              >
                全部笔记
              </Link>
              <Link href={url({ sort: "recent" })}>最近更新</Link>
              {roadmap.stages.map((s) => (
                <Link
                  key={s.id}
                  href={url({ stage: s.id })}
                  aria-current={s.id === stage ? "page" : undefined}
                >
                  {s.order}. {s.title}{" "}
                  <small>{all.filter((e) => e.stageId === s.id).length}</small>
                </Link>
              ))}
              <h3>标签</h3>
              {Array.from(new Set(all.flatMap((e) => e.tags))).map((t) => (
                <Link key={t} href={url({ tag: t })}>
                  # {t}
                </Link>
              ))}
              {owner && <Link href="/trash">回收站</Link>}
            </nav>
          </details>
        </ResponsivePanel>
        <section className="knowledge-main">
          <div className="section-head">
            <p>{entries.length} 篇匹配笔记</p>
            <nav className="view-links" aria-label="笔记视图">
              <Link
                href={url({ view: "list" })}
                aria-current={view !== "grid" ? "page" : undefined}
              >
                列表
              </Link>
              <Link
                href={url({ view: "grid" })}
                aria-current={view === "grid" ? "page" : undefined}
              >
                网格
              </Link>
            </nav>
          </div>
          <div
            className={view === "grid" ? "knowledge-grid" : "knowledge-list"}
          >
            {entries.map((e) => {
              const evidence = Object.values(progress.items).filter((i) =>
                i.evidence.some((v) => v.type === "note" && v.id === e.id),
              ).length;
              return (
                <article className="knowledge-row" key={e.id}>
                  {view === "grid" &&
                    (all.indexOf(e) < 3 || e.showInPortfolio) && (
                      <Thumbnail kind="note" index={all.indexOf(e)} />
                    )}
                  <h2>
                    <Link href={"/notes/" + e.id}>{e.title}</Link>
                  </h2>
                  <p>{excerpt(e.body).slice(0, 150)}</p>
                  <div className="record-meta">
                    <span>
                      {roadmap.stages.find((s) => s.id === e.stageId)?.title}
                    </span>
                    <time>{e.updatedAt.slice(0, 10)}</time>
                    <span>Evidence {evidence}</span>
                    <span>{statusLabel[e.status]}</span>
                  </div>
                  <div className="tags">
                    {e.tags.map((t) => (
                      <Link className="badge" key={t} href={url({ tag: t })}>
                        {t}
                      </Link>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
          {!entries.length && (
            <p className="empty">
              没有匹配笔记。清除筛选，或记录一次新的理解。
            </p>
          )}
        </section>
        <aside className="knowledge-filters">
          <form>
            <h2>筛选</h2>
            <input type="hidden" name="view" value={view} />
            <label>
              搜索笔记
              <input name="q" defaultValue={q} />
            </label>
            <label>
              阶段
              <select name="stage" defaultValue={stage}>
                <option value="">全部</option>
                {roadmap.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              标签
              <input name="tag" defaultValue={tag} />
            </label>
            <label>
              知识点
              <select name="topic" defaultValue={topic}>
                <option value="">全部</option>
                {roadmap.stages
                  .filter((s) => !stage || s.id === stage)
                  .flatMap((s) => s.groups.flatMap((g) => g.items))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              状态
              <select name="status" defaultValue={status}>
                <option value="">全部</option>
                {["planned", "in_progress", "completed"].map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary">筛选</button>{" "}
            <Link href="/notes">清除</Link>
          </form>
        </aside>
      </div>
    </>
  );
}

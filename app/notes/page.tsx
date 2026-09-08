import Link from "next/link";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { readEntries } from "@/lib/content/read";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; tag?: string }>;
}) {
  const owner = isOwner(await identity());
  const { q = "", stage = "", tag = "" } = await searchParams;
  const entries = (await readEntries()).filter(
    (e) =>
      !e.deletedAt &&
      (owner || e.showInPortfolio) &&
      (!stage || e.stageId === stage) &&
      (!tag || e.tags.includes(tag)) &&
      (e.title + " " + e.body + " " + e.tags.join(" "))
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">FIELD NOTES</p>
        <h1>学习笔记</h1>
        <p>记下理解、代码与疑问，让每一步都可回看。</p>
        {owner && (
          <Link className="button" href="/notes/new">
            新建笔记
          </Link>
        )}
      </div>
      <form className="toolbar">
        <label>
          搜索笔记
          <input name="q" defaultValue={q} />
        </label>
        <label>
          阶段
          <input name="stage" placeholder="stage-05" defaultValue={stage} />
        </label>
        <label>
          标签
          <input name="tag" defaultValue={tag} />
        </label>
        <button>筛选</button>
      </form>
      {entries.length ? (
        entries.map((e) => (
          <Link
            href={"/notes/" + e.id}
            key={e.id}
            className="paper panel entry-card"
          >
            <small>
              {e.stageId} · {e.updatedAt.slice(0, 10)}
            </small>
            <h2>{e.title}</h2>
            <p>{e.body.slice(0, 140)}</p>
            <div className="tags">
              {e.tags.map((t) => (
                <span className="badge" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </Link>
        ))
      ) : (
        <p className="empty">暂无可展示笔记。</p>
      )}
    </>
  );
}

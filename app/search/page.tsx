import Link from "next/link";
import { readEntries, readLearning } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { searchIndex } from "@/lib/search";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = searchIndex(
    await readEntries(),
    (await readLearning()).roadmap,
    q,
    isOwner(await identity()),
  );
  return (
    <>
      <div className="page-heading">
        <h1>检索学习档案</h1>
        <p>搜索标题、正文、标签、阶段与知识点。</p>
      </div>
      <form className="toolbar">
        <label>
          关键词
          <input name="q" defaultValue={q} maxLength={200} />
        </label>
        <button>搜索</button>
      </form>
      {results.map((r) => (
        <Link className="paper panel entry-card" href={r.url} key={r.id}>
          <small>
            {r.type} · {r.stage}
          </small>
          <h2>{r.title}</h2>
          <p>{r.body}</p>
        </Link>
      ))}
      {q && !results.length && <p>没有匹配记录。</p>}
    </>
  );
}

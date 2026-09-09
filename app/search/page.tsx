import Link from "next/link";
import { readEntries, readLearning } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { searchIndex } from "@/lib/search";
import { SearchCommand } from "@/components/ui/search-command";
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
      <SearchCommand query={q} />
      {Array.from(new Set(results.map((r) => r.type))).map((type) => (
        <section className="search-group" key={type}>
          <h2>{type}</h2>
          <ul>
            {results
              .filter((r) => r.type === type)
              .map((r) => (
                <li key={r.id}>
                  <Link
                    className="search-result"
                    href={
                      r.type === "roadmap"
                        ? "/roadmap?stage=" + r.stage + "#" + r.id
                        : r.url
                    }
                  >
                    <small>
                      {r.type} · {r.stage}
                    </small>
                    <h2>{r.title}</h2>
                    <p>{r.body}</p>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
      {q && !results.length && <p>没有匹配记录。</p>}
    </>
  );
}

import Link from "next/link";
import { readEntries, readLearning } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import {
  searchIndex,
  searchType,
  searchTypes,
  type SearchType,
} from "@/lib/search";
import { SearchCommand } from "@/components/ui/search-command";
import { SearchHighlight } from "@/components/ui/search-highlight";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q = "", type = "all" } = await searchParams;
  const selectedType = searchType(type);
  const results = searchIndex(
    await readEntries(),
    (await readLearning()).roadmap,
    q,
    isOwner(await identity()),
    selectedType,
  );
  return (
    <>
      <div className="page-heading">
        <h1>检索学习档案</h1>
        <p>搜索标题、正文、标签、阶段与知识点。</p>
      </div>
      <SearchCommand
        key={q + ":" + selectedType}
        query={q}
        type={selectedType}
      />
      {q && (
        <p>
          找到 {results.length} 项 · {searchTypes[selectedType]}
        </p>
      )}
      {Array.from(new Set(results.map((r) => r.type))).map((type) => (
        <section className="search-group" key={type}>
          <h2>{searchTypes[type as SearchType] || type}</h2>
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
                      {searchTypes[r.type as SearchType] || r.type} · {r.stage}
                    </small>
                    <h2>
                      <SearchHighlight text={r.title} query={q} />
                    </h2>
                    <p>
                      <SearchHighlight text={r.body} query={q} />
                    </p>
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

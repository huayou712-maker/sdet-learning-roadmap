import Link from "next/link";
import { readProjects, readEntries } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
export default async function Page() {
  const owner = isOwner(await identity());
  const projects = await readProjects();
  const entries = await readEntries();
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">BUILD SOMETHING REAL</p>
        <h1>项目档案</h1>
        <p>从测试用例，到可复现的质量工程。</p>
      </div>
      <div className="project-grid">
        {projects.map((p) => {
          const e = entries.find(
            (e) =>
              e.id === p.id && !e.deletedAt && (owner || e.showInPortfolio),
          );
          return (
            <Link
              className="paper panel project-tile"
              key={p.id}
              href={"/projects/" + p.id}
            >
              <small>PROJECT {p.projectNo}</small>
              <h2>{p.title}</h2>
              <p>
                {e?.checklist.filter((c) => c.completed).length || 0} /{" "}
                {p.checklist.length} 项验收
              </p>
              <span className="badge">{e?.status || "planned"}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

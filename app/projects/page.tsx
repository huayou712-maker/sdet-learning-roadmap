import Link from "next/link";
import projects from "@/data/projects.json";
export default function Page() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">BUILD SOMETHING REAL</p>
        <h1>项目档案</h1>
        <p>从测试用例，到可复现的质量工程。</p>
      </div>
      <div className="project-grid">
        {projects.map((p) => (
          <Link
            className="paper panel project-tile"
            key={p.id}
            href={"/projects/" + p.id}
          >
            <small>PROJECT {p.projectNo}</small>
            <h2>{p.title}</h2>
            <p>{p.checklist.length} 项验收标准</p>
            <span className="badge">计划中</span>
          </Link>
        ))}
      </div>
    </>
  );
}

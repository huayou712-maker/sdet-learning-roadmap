import Link from "next/link";
import roadmap from "@/data/roadmap.json";
import progress from "@/data/progress.json";
import projects from "@/data/projects.json";
import { progressStats } from "@/lib/stats";
import type { Progress } from "@/lib/models";
export default function Home() {
  const stats = progressStats(roadmap, progress as Progress);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">LEARN / BUILD / LEAVE EVIDENCE</p>
          <h1>SDET Learning OS</h1>
          <h2>测试开发学习与作品留痕系统</h2>
          <p>
            以代码为剑，以测试为眼，
            <br />
            在不确定的系统里构建可靠性。
          </p>
          <Link className="button" href="/roadmap">
            继续我的学习路线 <span>↗</span>
          </Link>
        </div>
        <div className="landscape" aria-hidden="true">
          <div className="sun" />
          <div className="ridge ridge-back" />
          <div className="ridge ridge-front" />
          <span className="vertical">行知有迹</span>
        </div>
        <div className="hero-foot">
          十阶进路 · 六项实战 <span>从理解，到可验证的作品。</span>
        </div>
      </section>
      <section className="stats">
        {[
          [
            stats.percent + "%",
            "总体进度",
            stats.completed + " / " + stats.total + " 个知识点",
          ],
          ["0", "连续学习天数", "从第一篇日课开始"],
          ["0 h", "累计学习时间", "以日课记录为准"],
          ["0 / 6", "项目完成", "每个项目都有验收标准"],
          ["0", "学习笔记", "让理解可以回看"],
          ["0", "作业提交", "以实战检验所学"],
        ].map(([value, label, detail]) => (
          <article key={label} className="paper stat">
            <small>{label}</small>
            <strong>{value}</strong>
            <span>{detail}</span>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="paper panel">
          <div className="section-head">
            <h2>学习路线</h2>
            <Link href="/roadmap">完整路线 ↗</Link>
          </div>
          <ol className="route-mini">
            {roadmap.stages.map((s) => (
              <li key={s.id}>
                <span>{String(s.order).padStart(2, "0")}</span>
                <Link href="/roadmap">{s.title}</Link>
              </li>
            ))}
          </ol>
        </section>
        <section className="paper panel">
          <p className="eyebrow">CURRENT CHAPTER / 01</p>
          <h2>计算机基础</h2>
          <p>不从头重学 Python。以项目驱动，缺什么补什么。</p>
          <div className="empty-illustration" aria-hidden="true">
            知 → 行 → 证
          </div>
          <h3>第一份学习证据，留给今天。</h3>
          <p>开始一篇笔记，记录你的理解、代码和仍待解决的问题。</p>
          <Link className="text-link" href="/notes">
            打开学习笔记 ↗
          </Link>
        </section>
        <aside className="ink panel">
          <p className="eyebrow">TODAY / 今日学习</p>
          <h2>落笔，才算开始。</h2>
          <p>今天还没有学习记录。给自己设一个可以完成的小目标。</p>
          <Link className="button outline" href="/daily">
            写今日计划 ↗
          </Link>
          <hr />
          <h3>需要复习</h3>
          <p>{stats.missingEvidence} 个已完成知识点待补证据。</p>
          <h3>最近动态</h3>
          <p>学习活动将在保存后出现在这里。</p>
        </aside>
      </div>
      <section className="paper panel">
        <div className="section-head">
          <h2>项目档案</h2>
          <Link href="/projects">查看全部 ↗</Link>
        </div>
        <div className="project-grid">
          {projects.slice(0, 4).map((p) => (
            <Link
              className="project-tile"
              href={"/projects/" + p.id}
              key={p.id}
            >
              <small>PROJECT / {String(p.projectNo).padStart(2, "0")}</small>
              <h3>{p.title}</h3>
              <span className="badge">计划中</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { readLearning, readProjects, readEntries } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { entryUrl } from "@/lib/content/catalog";
import { progressStats, learningStats } from "@/lib/stats";
export default async function Home() {
  const [{ roadmap, progress }, projects, all, session] = await Promise.all([
    readLearning(),
    readProjects(),
    readEntries(),
    identity(),
  ]);
  const owner = isOwner(session);
  const records = all.filter(
    (e) => !e.deletedAt && (owner || e.showInPortfolio),
  );
  const stats = progressStats(roadmap, progress);
  const activity = learningStats(records);
  const current = roadmap.stages.find((s) =>
    s.groups.some((g) => g.items.some((i) => !progress.items[i.id]?.completed)),
  );
  const today = records.find(
    (e) =>
      e.type === "daily" && e.date === new Date().toISOString().slice(0, 10),
  );
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
          [String(activity.streak), "连续学习天数", "按 UTC 日期计算"],
          [
            (activity.minutes / 60).toFixed(1) + " h",
            "累计学习时间",
            "仅汇总日课实际时长",
          ],
          [
            activity.projects + " / " + projects.length,
            "项目完成",
            "每个项目都有验收标准",
          ],
          [String(activity.notes), "学习笔记", "让理解可以回看"],
          [String(activity.assignments), "作业提交", "独立提交，不覆盖历史"],
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
          <p className="eyebrow">
            CURRENT CHAPTER / {current?.order || "完成"}
          </p>
          <h2>{current?.title || "十阶路线已完成"}</h2>
          <p>不从头重学 Python。以项目驱动，缺什么补什么。</p>
          <div className="empty-illustration" aria-hidden="true">
            知 → 行 → 证
          </div>
          <h3>最近笔记</h3>
          {records
            .filter((e) => e.type === "note")
            .slice(0, 3)
            .map((e) => (
              <p key={e.id}>
                <Link href={entryUrl(e)}>{e.title}</Link>
              </p>
            ))}
          {!activity.notes && (
            <p>尚无可展示笔记。记录理解、代码和仍待解决的问题。</p>
          )}
          <Link className="text-link" href="/notes">
            打开学习笔记 ↗
          </Link>
        </section>
        <aside className="ink panel">
          <p className="eyebrow">TODAY / 今日学习</p>
          <h2>{today?.title || "落笔，才算开始。"}</h2>
          <p>
            {today
              ? `计划 ${today.plannedMinutes} 分钟 · 实际 ${today.actualMinutes} 分钟`
              : "今天还没有可展示日课。给自己设一个可以完成的小目标。"}
          </p>
          {today && <p>{today.body.slice(0, 160)}</p>}
          <Link className="button outline" href="/daily">
            {owner ? "记录今日学习 ↗" : "查看日课 ↗"}
          </Link>
          <hr />
          <h3>需要复习</h3>
          <p>{stats.missingEvidence} 个已完成知识点待补证据。</p>
          <h3>最近动态</h3>
          {records.slice(0, 3).map((e) => (
            <p key={e.id}>
              <Link href={entryUrl(e)}>{e.title}</Link>
              <br />
              <small>{e.updatedAt.slice(0, 10)}</small>
            </p>
          ))}
          {!records.length && <p>学习活动将在提交到 GitHub 后出现在这里。</p>}
          <Link href="/timeline">完整留痕时间线 ↗</Link>
        </aside>
      </div>
      <section className="paper panel">
        <div className="section-head">
          <h2>项目档案</h2>
          <Link href="/projects">查看全部 ↗</Link>
        </div>
        <div className="project-grid">
          {projects.map((p) => (
            <Link
              className="project-tile"
              href={"/projects/" + p.id}
              key={p.id}
            >
              <small>PROJECT / {String(p.projectNo).padStart(2, "0")}</small>
              <h3>{p.title}</h3>
              <span className="badge">
                {records.find((e) => e.type === "project" && e.id === p.id)
                  ?.status || "planned"}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

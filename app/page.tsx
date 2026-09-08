import Link from "next/link";
import { readLearning, readProjects, readEntries } from "@/lib/content/read";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { entryUrl } from "@/lib/content/catalog";
import { progressStats, learningStats } from "@/lib/stats";
import { chapterGroups, statusLabel, excerpt } from "@/lib/dashboard";
import { timeline } from "@/lib/content/timeline";
import { repository } from "@/lib/github/contents";
import { Hero, Thumbnail, InkDecoration } from "@/components/dashboard/media";
import { Icon } from "@/components/ui/icon";
export default async function Home() {
  const [{ roadmap, progress }, projects, all, session, commits] =
    await Promise.all([
      readLearning(),
      readProjects(),
      readEntries(),
      identity(),
      repository().getCommitsForPath("data/progress.json"),
    ]);
  const owner = isOwner(session);
  const records = all.filter(
    (e) => !e.deletedAt && (owner || e.showInPortfolio),
  );
  const stats = progressStats(roadmap, progress);
  const activity = learningStats(records);
  const notes = records.filter((e) => e.type === "note").slice(0, 3);
  const events = timeline(records, commits, owner).slice(0, 5);
  const today = records.find(
    (e) =>
      e.type === "daily" && e.date === new Date().toISOString().slice(0, 10),
  );
  return (
    <>
      <section className="hero">
        <Hero />
        <div className="hero-copy">
          <p className="eyebrow">行知有迹 / SDET LEARNING JOURNAL</p>
          <h1>SDET Learning OS</h1>
          <h2>测试开发学习与作品留痕系统</h2>
          <p>
            以代码为剑，以测试为眼。
            <br />
            留下每一步可验证的行迹。
          </p>
          <Link className="button hero-cta" href="/roadmap">
            继续学习路线 <span aria-hidden="true">→</span>
          </Link>
        </div>
        <span className="hero-caption" aria-hidden="true">
          行有所学 · 学有所证
        </span>
      </section>
      <section className="stats core-stats" aria-label="核心学习指标">
        <article className="paper stat progress-stat">
          <div
            className="progress-ring"
            role="img"
            aria-label={"总体进度 " + stats.percent + "%"}
          >
            <svg viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="33" className="ring-track" />
              <circle
                cx="40"
                cy="40"
                r="33"
                pathLength="100"
                strokeDasharray={stats.percent + " 100"}
                className="ring-value"
              />
            </svg>
            <strong>{stats.percent}%</strong>
          </div>
          <div>
            <h3>总体进度</h3>
            <p>
              {stats.completed} / {stats.total} 个知识点
            </p>
          </div>
        </article>
        {[
          {
            name: "fire" as const,
            value: String(activity.streak),
            label: "连续学习",
            detail: "天 · 按 UTC 日期计算",
          },
          {
            name: "clock" as const,
            value: (activity.minutes / 60).toFixed(1) + " h",
            label: "累计学习时长",
            detail: "以日课实际投入为准",
          },
          {
            name: "flag" as const,
            value: activity.projects + " / " + projects.length,
            label: "项目完成",
            detail: "每个项目都有验收标准",
          },
        ].map((s) => (
          <article key={s.name} className="paper stat">
            <Icon name={s.name} />
            <div>
              <strong>{s.value}</strong>
              <h3>{s.label}</h3>
              <p>{s.detail}</p>
            </div>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="paper panel roadmap-overview">
          <InkDecoration />
          <div className="section-head">
            <h2>学习路线</h2>
            <Link href="/roadmap">查看全部 →</Link>
          </div>
          <ol className="chapter-timeline">
            {chapterGroups(roadmap, progress).map((g) => (
              <li
                key={g.title}
                className={
                  g.percent === 100
                    ? "completed"
                    : g.completed
                      ? "in_progress"
                      : "planned"
                }
              >
                <div>
                  <h3>{g.title}</h3>
                  <span>{g.percent}%</span>
                </div>
                <p>{g.description}</p>
                <small>
                  {g.completed} / {g.total} 项
                </small>
              </li>
            ))}
          </ol>
          <p className="evidence-reminder">
            {stats.missingEvidence} 个已完成知识点待补证据
          </p>
        </section>
        <section className="paper panel recent-notes">
          <div className="section-head">
            <h2>最近笔记</h2>
            <Link href="/notes">查看全部 →</Link>
          </div>
          {notes.map((e, i) => (
            <Link href={entryUrl(e)} key={e.id} className="note-row">
              <Thumbnail kind="note" index={i} />
              <div>
                <h3>{e.title}</h3>
                <p>{excerpt(e.body).slice(0, 65)}</p>
                <time>{e.updatedAt.slice(0, 10)}</time>
                <div className="tags">
                  {e.tags.slice(0, 2).map((t) => (
                    <span className="badge" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
          {!notes.length && (
            <div className="illustrated-empty">
              <Thumbnail kind="note" index={0} />
              <p>
                尚无可展示笔记。
                <br />
                每一次理解，都值得留下。
              </p>
              {owner && <Link href="/notes/new">写第一篇笔记 →</Link>}
            </div>
          )}
          <div className="secondary-counts">
            <Link href="/notes">{activity.notes} 篇笔记</Link>
            <Link href="/assignments">{activity.assignments} 次作业提交</Link>
          </div>
        </section>
        <aside className="ink panel recent-events">
          <div className="section-head">
            <h2>最近动态</h2>
            <Link href="/timeline">查看全部 →</Link>
          </div>
          <ol className="activity-timeline">
            {events.map((e) => {
              const record = records.find((r) => r.id === e.id);
              const status =
                e.type === "debug"
                  ? "debug"
                  : record?.status === "completed" ||
                      (e.type === "progress" && e.title.includes(": complete "))
                    ? "completed"
                    : record?.status === "submitted" ||
                        record?.status === "in_progress" ||
                        (record && record.updatedAt !== record.createdAt) ||
                        e.type === "progress"
                      ? "in_progress"
                      : "normal";
              return (
                <li className={status} key={e.id}>
                  <time>
                    {e.date.slice(5, 10)}
                    <small>{e.date.slice(11, 16)}</small>
                  </time>
                  <span className="event-dot" />
                  <div>
                    <Link href={e.url}>{e.title}</Link>
                    <small>
                      {{
                        note: "笔记",
                        assignment: "作业提交",
                        project: "项目更新",
                        debug: "问题复盘",
                        daily: "日课",
                        progress: "路线进度",
                      }[e.type] || e.type}
                    </small>
                  </div>
                </li>
              );
            })}
          </ol>
          {!events.length && (
            <p className="empty">暂无学习活动，正式提交后会自动留痕。</p>
          )}
          <div className="today-strip">
            <h3>今日学习</h3>
            <p>
              {today
                ? `${today.title} · 实际 ${today.actualMinutes} 分钟`
                : "今天尚无可展示日课。"}
            </p>
            <Link href="/daily">{owner ? "记录日课 →" : "查看日课 →"}</Link>
          </div>
        </aside>
      </div>
      <section className="paper panel featured-projects">
        <div className="section-head">
          <h2>项目档案</h2>
          <Link href="/projects">查看全部 →</Link>
        </div>
        <div className="project-grid featured-grid">
          {projects.slice(0, 4).map((p, i) => {
            const record = records.find(
              (e) => e.type === "project" && e.id === p.id,
            );
            const status = record?.status || "planned";
            return (
              <Link
                className="project-tile"
                href={"/projects/" + p.id}
                key={p.id}
              >
                <Thumbnail kind="project" index={i} />
                <div className="project-copy">
                  <small>PROJECT {String(p.projectNo).padStart(2, "0")}</small>
                  <h3>{p.title}</h3>
                  <p>{excerpt(record?.body || p.body).slice(0, 75)}</p>
                  <div className="tags">
                    {(record?.tags.length
                      ? record.tags
                      : p.checklist.slice(0, 2)
                    )
                      .slice(0, 3)
                      .map((t) => (
                        <span className="badge" key={t}>
                          {t}
                        </span>
                      ))}
                  </div>
                  <span className={"project-status " + status}>
                    {statusLabel[status] || status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

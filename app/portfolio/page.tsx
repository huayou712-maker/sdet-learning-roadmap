import Link from "next/link";
import { readProfile, readEntries, readLearning } from "@/lib/content/read";
import { progressStats } from "@/lib/stats";
import { entryUrl } from "@/lib/content/catalog";
import { Markdown } from "@/components/ui/markdown";
export default async function Page() {
  const [profile, all, { roadmap, progress }] = await Promise.all([
    readProfile(),
    readEntries(),
    readLearning(),
  ]);
  const visible = all.filter((e) => e.showInPortfolio && !e.deletedAt);
  const projects = visible.filter((e) => e.type === "project");
  const stats = progressStats(roadmap, progress);
  const branch = encodeURIComponent(
    process.env.GITHUB_CONTENT_BRANCH || "main",
  );
  return (
    <>
      <section className="portfolio-hero">
        <p className="eyebrow">SELECTED WORK / 测试开发作品集</p>
        <h1>
          把可靠性，
          <br />
          写进每一次实践。
        </h1>
        <p>
          {profile.name} / {profile.bio}
        </p>
        <p>
          路线进度 {stats.percent}% · {stats.completed}/{stats.total} 项知识点
        </p>
        <div className="tags">
          {profile.skills.map((s) => (
            <span className="badge" key={s}>
              {s}
            </span>
          ))}
        </div>
        <p>
          <a href="https://github.com/huayou712-maker/sdet-learning-roadmap">
            查看源码与学习留痕 ↗
          </a>
        </p>
      </section>
      <section>
        <div className="section-head">
          <h2>精选项目</h2>
          <span>以代码、报告与复盘说明能力</span>
        </div>
        {!projects.length && (
          <p className="paper panel">
            尚无已选择展示的项目。提交成果并勾选“在作品集展示”后会出现在这里。
          </p>
        )}
        <div className="project-grid portfolio-projects">
          {projects.map((e) => (
            <article className="paper panel" key={e.id}>
              <small>
                PROJECT {e.projectNo} · {e.status}
              </small>
              <h2>
                <Link href={entryUrl(e)}>{e.title}</Link>
              </h2>
              <p>
                验收：{e.checklist.filter((c) => c.completed).length}/
                {e.checklist.length}
              </p>
              <div className="tags">
                {e.tags.map((t) => (
                  <span key={t} className="badge">
                    {t}
                  </span>
                ))}
              </div>
              <details>
                <summary>项目说明与截图</summary>
                <Markdown body={e.body} />
              </details>
              <div className="actions">
                {e.repositoryPath && (
                  <a
                    href={
                      "https://github.com/huayou712-maker/sdet-learning-roadmap/tree/" +
                      branch +
                      "/" +
                      e.repositoryPath
                    }
                  >
                    仓库内代码 ↗
                  </a>
                )}
                {e.externalRepository && (
                  <a href={e.externalRepository}>外部仓库 ↗</a>
                )}
                {e.demoUrl && <a href={e.demoUrl}>演示 ↗</a>}
                {e.reportUrl && <a href={e.reportUrl}>测试报告 ↗</a>}
                <a
                  href={
                    "https://github.com/huayou712-maker/sdet-learning-roadmap/commits/" +
                    branch +
                    "/" +
                    e.path
                  }
                >
                  GitHub 历史 ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="paper panel">
        <h2>最近公开笔记与问题复盘</h2>
        {visible
          .filter((e) => e.type === "note" || e.type === "debug")
          .slice(0, 8)
          .map((e) => (
            <article className="portfolio-note" key={e.id}>
              <small>
                {e.updatedAt.slice(0, 10)} · {e.stageId}
              </small>
              <h3>
                <Link href={entryUrl(e)}>{e.title} ↗</Link>
              </h3>
              <p>{e.body.slice(0, 180)}</p>
            </article>
          ))}
        {!visible.some((e) => e.type === "note" || e.type === "debug") && (
          <p>尚无可展示记录。</p>
        )}
      </section>
    </>
  );
}

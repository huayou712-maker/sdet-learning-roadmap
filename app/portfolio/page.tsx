import Link from "next/link";
import {
  readProfile,
  readEntries,
  readLearning,
  readProjects,
} from "@/lib/content/read";
import { projectAcceptance } from "@/lib/content/project-checks";
import { progressStats } from "@/lib/stats";
import { entryUrl } from "@/lib/content/catalog";
import { Markdown } from "@/components/ui/markdown";
import { Hero, Thumbnail } from "@/components/dashboard/media";
import { documentSections } from "@/lib/presentation";
import { excerpt } from "@/lib/dashboard";
export default async function Page() {
  const [profile, all, { roadmap, progress }] = await Promise.all([
    readProfile(),
    readEntries(),
    readLearning(),
  ]);
  const visible = all.filter((e) => e.showInPortfolio && !e.deletedAt);
  const definitions = await readProjects();
  const projects = visible.filter((e) => e.type === "project");
  const stats = progressStats(roadmap, progress);
  const branch = encodeURIComponent(
    process.env.GITHUB_CONTENT_BRANCH || "main",
  );
  return (
    <>
      <section className="portfolio-hero">
        <Hero />
        <div className="portfolio-intro">
          <p className="eyebrow">SELECTED WORK / 测试开发作品集</p>
          <h1>
            把可靠性，
            <br />
            写进每一次实践。
          </h1>
          <p>
            {profile.name} / {profile.bio}
          </p>
          <p>SDET / QA Automation</p>
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
        </div>
      </section>
      <div className="portfolio-bento">
        <section className="bento-feature">
          <p className="eyebrow">FEATURED WORK</p>
          <h2>{projects[0]?.title || "可验证的项目成果"}</h2>
          {projects[0] ? (
            <>
              <Thumbnail kind="project" index={0} slot="portfolioFeature" />
              <p>{excerpt(projects[0].body).slice(0, 180)}</p>
              <Link href={entryUrl(projects[0])}>进入项目 →</Link>
            </>
          ) : (
            <p>尚无公开项目，不以示例数据代替成果。</p>
          )}
        </section>
        <aside className="bento-skills">
          <h2>技术方向</h2>
          <ul>
            {profile.skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </aside>
        <section className="bento-progress">
          <h2>持续实践</h2>
          <strong>{stats.percent}%</strong>
          <p>
            {stats.completed}/{stats.total} 个知识点
          </p>
          <Link href="/roadmap">查看路线与证据 →</Link>
        </section>
        <section className="bento-case">
          <h2>排障与复盘</h2>
          {visible
            .filter((e) => e.type === "debug")
            .slice(0, 2)
            .map((e) => (
              <p key={e.id}>
                <Link href={entryUrl(e)}>{e.title} →</Link>
              </p>
            ))}
          {!visible.some((e) => e.type === "debug") && (
            <p>暂无公开排障案例。</p>
          )}
        </section>
      </div>
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
          {projects.map((e, i) => {
            const definition = definitions.find((p) => p.id === e.id);
            const acceptance = definition
              ? projectAcceptance(definition, e.checklist)
              : null;
            return (
              <article className="paper panel" key={e.id}>
                <Thumbnail
                  kind="project"
                  index={i}
                  slot={
                    projects.length === 1 ? "portfolioSingle" : "portfolioGrid"
                  }
                />
                <small>
                  PROJECT {e.projectNo} · {e.status}
                </small>
                <h2>
                  <Link href={entryUrl(e)}>{e.title}</Link>
                </h2>
                <p>
                  必做自评：
                  {acceptance
                    ? acceptance.completed + "/" + acceptance.total
                    : "课程定义不可用"}
                </p>
                <div className="tags">
                  {e.tags.map((t) => (
                    <span key={t} className="badge">
                      {t}
                    </span>
                  ))}
                </div>
                <dl className="portfolio-evidence">
                  {[
                    ["Problem", "项目背景"],
                    ["Architecture", "架构设计"],
                    ["Tests", "测试范围"],
                    ["Result", "成果"],
                  ].map(([label, title]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>
                        {excerpt(
                          documentSections(e.body).find(
                            (s) => s.title === title,
                          )?.body || "尚未记录",
                        ).slice(0, 220)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p>
                  CI / Report：
                  {e.reportUrl ? (
                    <a href={e.reportUrl}>查看报告 ↗</a>
                  ) : (
                    "尚未提供"
                  )}
                </p>
                <p>
                  Debug Case：
                  {visible
                    .filter((d) => d.type === "debug" && d.projectId === e.id)
                    .map((d) => (
                      <Link key={d.id} href={entryUrl(d)}>
                        {d.title} ↗{" "}
                      </Link>
                    ))}
                  {!visible.some(
                    (d) => d.type === "debug" && d.projectId === e.id,
                  ) && "暂无关联案例"}
                </p>
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
            );
          })}
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
              <p>{excerpt(e.body).slice(0, 180)}</p>
            </article>
          ))}
        {!visible.some((e) => e.type === "note" || e.type === "debug") && (
          <p>尚无可展示记录。</p>
        )}
      </section>
    </>
  );
}

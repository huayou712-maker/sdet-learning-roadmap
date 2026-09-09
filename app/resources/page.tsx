import { repository } from "@/lib/github/contents";
import { AppError } from "@/lib/errors";
import { Markdown } from "@/components/ui/markdown";
import { readLearning } from "@/lib/content/read";
import { resourceSections } from "@/lib/resource-view";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; topic?: string; type?: string }>;
}) {
  const file = await repository().getTextFile("docs/RESOURCES.md");
  if (!file) throw new AppError(503, "资源文档尚未提交到目标分支");
  const { roadmap } = await readLearning();
  const { stage = "", topic = "", type = "" } = await searchParams;
  const resources = resourceSections(file.content);
  const rows = resources.filter(
    (r) =>
      (!stage || r.stage === stage) &&
      (!topic || r.title === topic) &&
      (!type || r.types.some((value) => value === type)),
  );
  return (
    <>
      <header className="page-heading">
        <h1>课程资源库</h1>
        <p>按路线查找资源，只学当前阶段需要的内容。</p>
      </header>
      <form className="toolbar">
        <label>
          阶段
          <select name="stage" defaultValue={stage}>
            <option value="">全部</option>
            {roadmap.stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          主题
          <select name="topic" defaultValue={topic}>
            <option value="">全部</option>
            {resources.map((r) => (
              <option key={r.title}>{r.title}</option>
            ))}
          </select>
        </label>
        <label>
          资源类型
          <select name="type" defaultValue={type}>
            <option value="">全部</option>
            <option value="video">视频</option>
            <option value="code">代码仓库</option>
            <option value="website">网站</option>
          </select>
        </label>
        <button className="secondary">筛选</button>
      </form>
      <p className="record-meta">
        资源学习状态暂未记录；不会以本机状态替代 GitHub 正式数据。
      </p>
      <div className="resource-library">
        {rows.map((r) => (
          <section key={r.title}>
            <header>
              <small>
                {roadmap.stages.find((s) => s.id === r.stage)?.title ||
                  "路线参考"}
              </small>
              <h2>{r.title}</h2>
            </header>
            <ul>
              {r.urls.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer">
                    {new URL(url).hostname} · {url} ↗
                  </a>
                </li>
              ))}
            </ul>
            <details>
              <summary>课程说明与学习重点</summary>
              <Markdown body={r.body} />
            </details>
          </section>
        ))}
      </div>
      {!rows.length && <p>暂无匹配资源。</p>}
      <details className="resource-original">
        <summary>查看完整原始资源清单</summary>
        <Markdown body={file.content} />
      </details>
    </>
  );
}

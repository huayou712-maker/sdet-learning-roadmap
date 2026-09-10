import Link from "next/link";
import { repository } from "@/lib/github/contents";
import { readLearning } from "@/lib/content/read";
import { Markdown } from "@/components/ui/markdown";

export default async function BeginnerGuide() {
  const [guide, { roadmap }] = await Promise.all([
    repository().getTextFile("docs/BEGINNER_PATH.md"),
    readLearning(),
  ]);
  const branch = encodeURIComponent(
    process.env.GITHUB_CONTENT_BRANCH || "main",
  );
  const repoUrl =
    "https://github.com/huayou712-maker/sdet-learning-roadmap/blob/" +
    branch +
    "/";
  return (
    <article className="paper panel reading-article">
      <p className="eyebrow">BEGINNER FIELD GUIDE</p>
      <h1>初学者实践指南</h1>
      <Link href="/roadmap">返回路线与证据 →</Link>
      {guide ? (
        <Markdown body={guide.content} />
      ) : (
        <p>内容分支尚未包含入门指南，请先在 GitHub 部署对应课程版本。</p>
      )}
      {roadmap.beginnerPath?.map((task, i) => (
        <section key={task.id} id={"task-" + task.id}>
          <h2>
            {i + 1}. {task.title}
          </h2>
          <p>{task.summary}</p>
          <p>交付：{task.deliverable}</p>
          <ul>
            {task.acceptance.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <a href={repoUrl + task.guidePath}>在 GitHub 阅读任务文件 ↗</a>
        </section>
      ))}
    </article>
  );
}

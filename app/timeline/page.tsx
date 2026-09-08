import Link from "next/link";
import { readEntries } from "@/lib/content/read";
import { repository } from "@/lib/github/contents";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { timeline } from "@/lib/content/timeline";
export default async function Page() {
  const items = timeline(
    await readEntries(),
    await repository().getCommitsForPath("data/progress.json"),
    isOwner(await identity()),
  );
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">A TRACE OF PRACTICE</p>
        <h1>学习时间线</h1>
        <p>每次正式保存，都是一次可以回看的进步。</p>
      </div>
      <ol className="timeline">
        {items.map((i) => (
          <li className="paper panel" key={i.id}>
            <time>{i.date.slice(0, 16).replace("T", " ")} UTC</time>
            <h2>
              <Link href={i.url}>{i.title}</Link>
            </h2>
            <span className="badge">{i.type}</span>
          </li>
        ))}
      </ol>
      {!items.length && <p>暂无学习活动。</p>}
    </>
  );
}

import Link from "next/link";
import { repository } from "@/lib/github/contents";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { buildTimeline } from "@/lib/content/timeline";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type = "" } = await searchParams;
  const items = (
    await buildTimeline(repository(), isOwner(await identity()))
  ).filter((e) => !type || e.type === type);
  const dates = Array.from(new Set(items.map((e) => e.date.slice(0, 10))));
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">LEARNING ACTIVITY</p>
        <h1>学习时间线</h1>
        <p>按 UTC 日期排列的学习提交与进展。</p>
        <small>最近 30 条记录展开提交历史；更早版本可在记录详情查看。</small>
      </header>
      <nav className="status-tabs" aria-label="活动类型">
        {[
          ["", "全部"],
          ["progress", "进度"],
          ["note", "笔记"],
          ["assignment", "作业"],
          ["project", "项目"],
          ["debug", "排障"],
          ["daily", "日课"],
        ].map(([t, label]) => (
          <Link
            key={t}
            href={"/timeline?type=" + t}
            aria-current={type === t ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="activity-feed">
        {dates.map((date) => (
          <section className="activity-day" key={date}>
            <h2>
              <time>{date}</time>
            </h2>
            <ol>
              {items
                .filter((e) => e.date.startsWith(date))
                .map((e) => (
                  <li key={e.id}>
                    <time>{e.date.slice(11, 16)}</time>
                    <div>
                      <span className="badge">{e.type}</span>
                      <h3>
                        <Link href={e.url}>{e.title}</Link>
                      </h3>
                      {/[a-f0-9]{40}$/.test(e.id) && (
                        <code>{e.id.slice(-40, -33)}</code>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
          </section>
        ))}
      </div>
      {!items.length && <p className="empty">暂无此类型的学习活动。</p>}
    </>
  );
}

import Link from "next/link";
import type { Entry } from "@/lib/schemas/content";
import { Markdown } from "@/components/ui/markdown";
import { documentSections } from "@/lib/presentation";
import { learningStats } from "@/lib/stats";
import { excerpt, statusLabel } from "@/lib/dashboard";
export function DailyJournal({
  entries,
  date,
  owner,
}: {
  entries: Entry[];
  date?: string;
  owner: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const selected =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date))
      ? date
      : today;
  const entry = entries.find((e) => e.date === selected);
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.parse(selected + "T12:00:00Z") + (i - 3) * 86400000)
      .toISOString()
      .slice(0, 10),
  );
  const weekStart = new Date(today + "T00:00:00Z");
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
  );
  const weekMinutes = entries
    .filter(
      (e) =>
        e.date &&
        e.date >= weekStart.toISOString().slice(0, 10) &&
        e.date <= today,
    )
    .reduce((sum, e) => sum + e.actualMinutes, 0);
  return (
    <>
      <form className="toolbar">
        <label>
          选择日期（UTC）
          <input type="date" name="date" defaultValue={selected} />
        </label>
        <button className="secondary">查看日课</button>
        <Link href={"/daily?date=" + today}>今天</Link>
      </form>
      <nav className="date-strip" aria-label="日期导航">
        {days.map((d) => (
          <Link
            key={d}
            href={"/daily?date=" + d}
            aria-current={selected === d ? "page" : undefined}
          >
            <small>{d.slice(5, 7)} 月</small>
            <strong>{d.slice(8)}</strong>
            <span>{entries.some((e) => e.date === d) ? "已记录" : "—"}</span>
          </Link>
        ))}
      </nav>
      <div className="detail-workspace">
        <article className="daily-page">
          <h2>{selected} 日课</h2>
          {entry ? (
            <>
              <div className="record-meta">
                <span>预计 {entry.plannedMinutes} 分钟</span>
                <span>实际 {entry.actualMinutes} 分钟</span>
                <span>{statusLabel[entry.status]}</span>
              </div>
              <Markdown body={entry.body} />
              {owner && (
                <Link
                  className="button secondary"
                  href={"/daily/" + entry.id + "?edit=1"}
                >
                  编辑日课
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="empty">这一天还没有可展示日课。</p>
              {owner && (
                <Link className="button" href={"/daily/new?date=" + selected}>
                  记录这一天
                </Link>
              )}
            </>
          )}
        </article>
        <aside className="detail-metadata">
          <h2>学习节律</h2>
          <p>连续学习 {learningStats(entries).streak} 天</p>
          <p>本周投入 {weekMinutes} 分钟</p>
          <h3>最近 7 天</h3>
          <ol className="related-list">
            {Array.from({ length: 7 }, (_, i) =>
              new Date(Date.parse(today + "T12:00:00Z") - i * 86400000)
                .toISOString()
                .slice(0, 10),
            ).map((d) => (
              <li key={d}>
                <Link href={"/daily?date=" + d}>
                  {d.slice(5)} ·{" "}
                  {entries
                    .filter((e) => e.date === d)
                    .reduce((sum, e) => sum + e.actualMinutes, 0)}{" "}
                  分钟
                </Link>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
const debugSteps = [
  ["现象", "现象"],
  ["上下文", "上下文"],
  ["假设", "初始假设"],
  ["排查过程", "排查过程"],
  ["根因", "根因"],
  ["修复", "修复方案"],
  ["验证", "验证结果"],
  ["预防", "预防方式"],
];
export function DebugDocument({ entry }: { entry: Entry }) {
  const sections = documentSections(entry.body);
  return (
    <article className="debug-document">
      <ol className="debug-steps">
        {debugSteps.map(([title, alias]) => (
          <li key={title}>
            <h2>{title}</h2>
            <Markdown
              body={
                sections.find((s) => s.title === title || s.title === alias)
                  ?.body || "此步骤尚未记录。"
              }
            />
          </li>
        ))}
      </ol>
      <details>
        <summary>完整原文（含附加记录）</summary>
        <Markdown body={entry.body} />
      </details>
    </article>
  );
}
export function DebugLibrary({
  entries,
  query,
}: {
  entries: Entry[];
  query: Record<string, string | undefined>;
}) {
  const { q = "", project = "", category = "" } = query;
  const rows = entries.filter(
    (e) =>
      (!project || e.projectId === project) &&
      (!category || e.tags.includes(category)) &&
      (e.title + " " + e.body).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <form className="toolbar">
        <label>
          搜索问题
          <input name="q" defaultValue={q} />
        </label>
        <label>
          项目
          <select name="project" defaultValue={project}>
            <option value="">全部</option>
            {Array.from(
              new Set(entries.map((e) => e.projectId).filter(Boolean)),
            ).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          分类标签
          <select name="category" defaultValue={category}>
            <option value="">全部</option>
            {Array.from(new Set(entries.flatMap((e) => e.tags))).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <button className="secondary">筛选</button>
      </form>
      <div className="incident-list">
        {rows.map((e) => (
          <article key={e.id}>
            <div>
              <p className="eyebrow">
                {e.projectId || "未关联项目"} · {e.tags.join(" / ")}
              </p>
              <h2>
                <Link href={"/debug-journal/" + e.id}>{e.title}</Link>
              </h2>
              <p>
                根因：
                {excerpt(
                  documentSections(e.body).find((s) => s.title === "根因")
                    ?.body || "尚未记录",
                ).slice(0, 160)}
              </p>
            </div>
            <div>
              <span>{statusLabel[e.status]}</span>
              <p>{e.durationMinutes} 分钟</p>
              {e.completedAt && (
                <time>解决于 {e.completedAt.slice(0, 10)}</time>
              )}
            </div>
          </article>
        ))}
      </div>
      {!rows.length && <p className="empty">暂无匹配排障案例。</p>}
    </>
  );
}

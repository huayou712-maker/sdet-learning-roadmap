import type { Entry } from "@/lib/schemas/content";
import type { CommitInfo } from "@/lib/github/types";
import { entryUrl } from "./catalog";
import type { Repository } from "@/lib/github/types";
import { entries as loadEntries } from "./service";
export async function buildTimeline(repo: Repository, owner: boolean) {
  const records = (await loadEntries(repo)).filter(
    (e) => !e.deletedAt && (owner || e.showInPortfolio),
  );
  const events = timeline(
    records,
    await repo.getCommitsForPath("data/progress.json"),
    owner,
  );
  // Enrich recent records with full per-file history; older records keep metadata events.
  for (let i = 0; i < Math.min(records.length, 30); i += 6) {
    await Promise.all(
      records.slice(i, Math.min(i + 6, 30)).map(async (e) => {
        const history = await repo.getCommitsForPath(e.path);
        if (!history.length) return;
        const current = events.findIndex((v) => v.id === e.id);
        if (current >= 0) events.splice(current, 1);
        events.push(
          ...history.map((c) => ({
            id: e.id + "-" + c.sha,
            title: owner ? c.message : e.title + " · 历史提交",
            date: c.date,
            url: entryUrl(e),
            type: e.type,
          })),
        );
      }),
    );
  }
  return events.sort((a, b) => b.date.localeCompare(a.date));
}
export function timeline(
  entries: Entry[],
  commits: CommitInfo[],
  owner: boolean,
) {
  const activity = entries
    .filter((e) => !e.deletedAt && (owner || e.showInPortfolio))
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.updatedAt,
      url: entryUrl(e),
      type: e.type,
    }));
  return [
    ...activity,
    ...commits.map((c) => ({
      id: c.sha,
      title: c.message,
      date: c.date,
      url: c.url,
      type: "progress",
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

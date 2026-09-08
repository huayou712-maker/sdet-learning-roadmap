import type { Entry } from "@/lib/schemas/content";
import type { CommitInfo } from "@/lib/github/types";
import { entryUrl } from "./catalog";
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

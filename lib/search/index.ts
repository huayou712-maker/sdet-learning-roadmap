import type { Entry } from "@/lib/schemas/content";
import type { Roadmap } from "@/lib/models";
import { entryUrl } from "@/lib/content/catalog";
export const searchTypes = {
  all: "全部内容",
  note: "学习笔记",
  assignment: "作业",
  project: "项目",
  daily: "日课",
  debug: "排障记录",
  roadmap: "知识点",
} as const;
export type SearchType = keyof typeof searchTypes;
export function searchType(value: string): SearchType {
  return Object.hasOwn(searchTypes, value) ? (value as SearchType) : "all";
}
export function searchExcerpt(body: string, query: string, limit = 180) {
  const q = query.trim().toLowerCase().slice(0, 200);
  const match = q ? body.toLowerCase().indexOf(q) : -1;
  const length = Math.max(limit, q.length);
  const start = Math.max(0, match - Math.floor((length - q.length) / 2));
  const end = Math.min(body.length, start + length);
  return (
    (start ? "…" : "") + body.slice(start, end) + (end < body.length ? "…" : "")
  );
}
export function highlightParts(text: string, query: string) {
  const q = query.trim().toLowerCase().slice(0, 200);
  if (!q) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let start = 0;
  let index: number;
  while ((index = lower.indexOf(q, start)) !== -1) {
    if (index > start)
      parts.push({ text: text.slice(start, index), match: false });
    parts.push({ text: text.slice(index, index + q.length), match: true });
    start = index + q.length;
  }
  if (start < text.length)
    parts.push({ text: text.slice(start), match: false });
  return parts;
}
export function searchIndex(
  entries: Entry[],
  roadmap: Roadmap,
  query: string,
  owner = false,
  type: SearchType = "all",
) {
  const q = query.trim().toLowerCase().slice(0, 200);
  if (!q) return [];
  return [
    ...entries
      .filter((e) => !e.deletedAt && (owner || e.showInPortfolio))
      .map((e) => ({
        id: e.id,
        title: e.title,
        body: e.body,
        tags: e.tags.join(" "),
        stage: e.stageId,
        topic: e.topicIds.join(" "),
        url: entryUrl(e),
        type: e.type,
      })),
    ...roadmap.stages.flatMap((s) =>
      s.groups.flatMap((g) =>
        g.items.map((i) => ({
          id: i.id,
          title: i.title,
          body: s.description,
          tags: g.title,
          stage: s.id,
          topic: i.id,
          url: "/roadmap#" + i.id,
          type: "roadmap",
        })),
      ),
    ),
  ]
    .filter(
      (e) =>
        (type === "all" || e.type === type) &&
        (e.title + " " + e.body + " " + e.tags + " " + e.stage + " " + e.topic)
          .toLowerCase()
          .includes(q),
    )
    .map((e) => ({ ...e, body: searchExcerpt(e.body, q) }));
}

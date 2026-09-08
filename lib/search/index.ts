import type { Entry } from "@/lib/schemas/content";
import type { Roadmap } from "@/lib/models";
import { entryUrl } from "@/lib/content/catalog";
export function searchIndex(
  entries: Entry[],
  roadmap: Roadmap,
  query: string,
  owner = false,
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
    .filter((e) =>
      (e.title + " " + e.body + " " + e.tags + " " + e.stage + " " + e.topic)
        .toLowerCase()
        .includes(q),
    )
    .map((e) => ({ ...e, body: e.body.slice(0, 180) }));
}

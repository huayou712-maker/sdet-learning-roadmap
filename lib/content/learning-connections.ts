import type { Entry, Kind } from "@/lib/schemas/content";
import type { Progress, Roadmap } from "@/lib/models";
import { entryUrl } from "./catalog";

export type RecordConnection = {
  id: string;
  type: Kind;
  title: string;
  href: string;
  reason: string;
};
export type TopicConnection = {
  id: string;
  title: string;
  href: string;
  evidence: boolean;
  declared: boolean;
};
export type NoteConnections = {
  topics: TopicConnection[];
  tasks: { id: string; title: string; href: string }[];
  records: RecordConnection[];
  fallback: boolean;
};
export const connectionLabels: Record<Kind, string> = {
  note: "笔记",
  assignment: "作业",
  project: "项目",
  debug: "排障手记",
  daily: "每日学记",
};
const key = (entry: Pick<Entry, "id" | "type">) => entry.type + ":" + entry.id;

/** Visibility precedes matching, ranking, truncation and client serialization. */
export function learningEntriesForViewer(entries: Entry[], owner: boolean) {
  return entries.filter((e) => !e.deletedAt && (owner || e.showInPortfolio));
}

/** A read-only presentation copy. Never use this projection for owner writes. */
export function publicLearningProgress(progress: Progress, visible: Entry[]) {
  const allowed = new Set(learningEntriesForViewer(visible, false).map(key));
  return {
    ...progress,
    items: Object.fromEntries(
      Object.entries(progress.items).map(([id, item]) => [
        id,
        {
          ...item,
          evidence: item.evidence.filter(
            (ref) =>
              ref.type === "commit" ||
              allowed.has(key({ type: ref.type, id: ref.id })),
          ),
        },
      ]),
    ),
  };
}

function entryTopics(entry: Entry, roadmap: Roadmap, progress: Progress) {
  return roadmap.stages.flatMap((stage) =>
    stage.groups.flatMap((group) =>
      group.items.flatMap((topic): TopicConnection[] => {
        const declared = entry.topicIds.includes(topic.id);
        const evidence = Boolean(
          progress.items[topic.id]?.evidence.some(
            (ref) => ref.id === entry.id && ref.type === entry.type,
          ),
        );
        return declared || evidence
          ? [
              {
                id: topic.id,
                title: topic.title,
                href: "/roadmap?stage=" + stage.id + "#" + topic.id,
                declared,
                evidence,
              },
            ]
          : [];
      }),
    ),
  );
}

function candidates(entries: Entry[], owner: boolean) {
  const seen = new Set<string>();
  return learningEntriesForViewer(entries, owner).filter((entry) => {
    if (entry.type === "daily" || seen.has(key(entry))) return false;
    seen.add(key(entry));
    return true;
  });
}

type Match = { entry: Entry; reason: string; priority: number };
function links(matches: Match[], limit: number): RecordConnection[] {
  return matches
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        b.entry.updatedAt.localeCompare(a.entry.updatedAt) ||
        key(a.entry).localeCompare(key(b.entry)),
    )
    .slice(0, limit)
    .map(({ entry, reason }) => ({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      href: entryUrl(entry),
      reason,
    }));
}

export function connectionsForTasks(
  roadmap: Roadmap,
  progress: Progress,
  entries: Entry[],
  owner: boolean,
): Record<string, RecordConnection[]> {
  const indexed = candidates(entries, owner).map((entry) => ({
    entry,
    topics: entryTopics(entry, roadmap, progress),
  }));
  return Object.fromEntries(
    (roadmap.beginnerPath ?? []).map((task) => {
      const matches = indexed.flatMap(({ entry, topics }): Match[] => {
        const shared = topics.filter((topic) =>
          task.topicIds.includes(topic.id),
        );
        if (!shared.length) return [];
        const registered = shared.some((topic) => topic.evidence);
        return [
          {
            entry,
            priority: registered ? 0 : 1,
            reason: registered
              ? "已登记为本任务的知识点证据"
              : "标注了本任务的知识点",
          },
        ];
      });
      return [task.id, links(matches, 3)];
    }),
  );
}

export function connectionsForNote(
  source: Entry,
  entries: Entry[],
  roadmap: Roadmap,
  progress: Progress,
  owner: boolean,
): NoteConnections {
  if (!learningEntriesForViewer([source], owner).length)
    return { topics: [], tasks: [], records: [], fallback: false };
  const visible = candidates(entries, owner);
  const topics = entryTopics(source, roadmap, progress);
  const topicIds = new Set(topics.map((topic) => topic.id));
  const tasks = (roadmap.beginnerPath ?? [])
    .filter((task) => task.topicIds.some((id) => topicIds.has(id)))
    .map(({ id, title }) => ({ id, title, href: "/roadmap#task-" + id }));
  const project = visible.find(
    (entry) => entry.type === "project" && entry.id === source.projectId,
  );
  const others = visible.filter((entry) => key(entry) !== key(source));
  const matches = others.flatMap((entry): Match[] => {
    const shared = entryTopics(entry, roadmap, progress).filter((topic) =>
      topicIds.has(topic.id),
    );
    if (shared.length)
      return [
        {
          entry,
          priority: 0,
          reason:
            "共同知识点 · " +
            shared[0].title +
            (shared.length > 1 ? " 等 " + shared.length + " 项" : ""),
        },
      ];
    if (
      project &&
      (entry.projectId === project.id || key(entry) === key(project))
    )
      return [{ entry, priority: 1, reason: "同一项目 · " + project.title }];
    return [];
  });
  const fallback = matches.length === 0;
  return {
    topics,
    tasks,
    fallback,
    records: links(
      fallback
        ? others
            .filter(
              (entry) =>
                entry.type === "note" && entry.stageId === source.stageId,
            )
            .map((entry) => ({
              entry,
              priority: 2,
              reason: "同阶段参考 · 未建立知识点关联",
            }))
        : matches,
      fallback ? 3 : 5,
    ),
  };
}

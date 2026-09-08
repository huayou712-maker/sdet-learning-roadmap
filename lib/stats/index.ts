import type { Progress, Roadmap } from "@/lib/models";
import type { Entry } from "@/lib/schemas/content";
export function learningStats(
  records: Entry[],
  today = new Date().toISOString().slice(0, 10),
) {
  const active = records.filter((e) => !e.deletedAt);
  const days = active.filter((e) => e.type === "daily");
  return {
    minutes: days.reduce((sum, e) => sum + e.actualMinutes, 0),
    streak: streak(
      active
        .map((e) => (e.type === "daily" ? e.date! : e.updatedAt.slice(0, 10)))
        .filter(Boolean),
      today,
    ),
    notes: active.filter((e) => e.type === "note").length,
    assignments: active.filter((e) => e.type === "assignment").length,
    projects: active.filter(
      (e) => e.type === "project" && e.status === "completed",
    ).length,
  };
}
export function progressStats(roadmap: Roadmap, progress: Progress) {
  const ids = roadmap.stages.flatMap((s) =>
    s.groups.flatMap((g) => g.items.map((i) => i.id)),
  );
  const done = ids.filter((id) => progress.items[id]?.completed);
  return {
    total: ids.length,
    completed: done.length,
    percent: ids.length ? Math.round((done.length / ids.length) * 100) : 0,
    missingEvidence: done.filter((id) => !progress.items[id]?.evidence.length)
      .length,
  };
}
export function streak(
  dates: string[],
  today = new Date().toISOString().slice(0, 10),
) {
  const set = new Set(dates);
  const cursor = new Date(today + "T00:00:00Z");
  if (!set.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let count = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}

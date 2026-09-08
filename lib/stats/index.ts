import type { Progress, Roadmap } from "@/lib/models";
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

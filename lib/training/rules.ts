import type { Entry } from "@/lib/schemas/content";
import type { Progress, Roadmap } from "@/lib/models";
import { nextBeginnerTask } from "@/lib/learning-path";
import { faults, type Grade, type Review, type TrainingState } from "./schema";
export type ReviewSource = Pick<
  Entry,
  "id" | "type" | "title" | "deletedAt" | "sha"
>;
export function sourceFor(card: Review, sources: ReviewSource[]) {
  return sources.find(
    (s) => s.id === card.sourceId && s.type === card.sourceType && !s.deletedAt,
  );
}
export function nextReview(streak: number, grade: Grade, now: Date) {
  const days =
    grade === "again"
      ? 1
      : grade === "hint"
        ? 3
        : [3, 7, 14, 30][Math.min(streak, 3)];
  const date = new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + days);
  return {
    due: date.toISOString().slice(0, 10),
    streak: grade === "independent" ? streak + 1 : 0,
    days,
  };
}
export function dueReviews(
  state: TrainingState,
  sources: ReviewSource[],
  today: string,
) {
  return state.reviews
    .filter((r) => !r.suspended && r.due <= today && sourceFor(r, sources))
    .sort(
      (a, b) =>
        a.due.localeCompare(b.due) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
}
export type Recommendation = {
  id: string;
  title: string;
  reason: string;
  href: string;
  minutes: number;
};
export function recommendTraining(
  state: TrainingState,
  sources: ReviewSource[],
  roadmap: Roadmap,
  progress: Progress,
  today: string,
  budget: number,
): Recommendation[] {
  const available = Math.max(
    0,
    Math.min(180, Number.isFinite(budget) ? Math.floor(budget) : 0),
  );
  if (!available) return [];
  const candidates: Recommendation[] = [];
  for (const card of dueReviews(state, sources, today).slice(0, 3))
    candidates.push({
      id: card.id,
      title: card.question,
      reason: `复习到期：${card.due}（UTC）。先作答，再核对参考答案。`,
      href: "/training?tab=review&card=" + card.id,
      minutes: card.kind === "code" ? 20 : 10,
    });
  const last = state.attempts.at(-1);
  if (last && last.normal !== "passed")
    candidates.push({
      id: "normal",
      title: "先让独立测试在正常实现上通过",
      reason: "最新自报结果未通过基线，暂时不能判断故障检出能力。",
      href: "/training?tab=practice",
      minutes: 30,
    });
  else if (last)
    for (const fault of faults)
      if (last.faults[fault.id] !== "detected")
        candidates.push({
          id: fault.id,
          title: "再次验证：" + fault.title,
          reason: `最新自报结果${last.faults[fault.id] === "missed" ? "漏检" : "尚未验证"}。${fault.suggestion}`,
          href: "/training?tab=practice",
          minutes: 30,
        });
  const task = nextBeginnerTask(roadmap, progress);
  if (task)
    candidates.push({
      id: task.id,
      title: task.title,
      reason: "当前实践主线尚未完成；勾选仍是自评，不是能力认证。",
      href: "/roadmap#task-" + task.id,
      minutes: 40,
    });
  const result: Recommendation[] = [];
  let remaining = available;
  for (const item of candidates) {
    if (!remaining || result.length === 3) break;
    const minutes = Math.min(item.minutes, remaining);
    result.push({
      ...item,
      minutes,
      reason:
        item.reason +
        (minutes < item.minutes
          ? ` 本次先投入 ${minutes} 分钟，可继续下次完成。`
          : ""),
    });
    remaining -= minutes;
  }
  return result;
}

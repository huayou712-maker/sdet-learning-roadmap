import type { Roadmap, Progress } from "./models";
import { progressStats } from "./stats";
export function chapterGroups(roadmap: Roadmap, progress: Progress) {
  return [
    { title: "基础夯实", orders: [1, 2, 3] },
    { title: "测试开发核心", orders: [4, 5, 6] },
    { title: "工程化与实战", orders: [7, 8] },
    { title: "进阶与拓展", orders: [9, 10] },
  ].map((g) => {
    const stages = roadmap.stages.filter((s) => g.orders.includes(s.order));
    return {
      ...g,
      description: stages.map((s) => s.title).join(" · "),
      ...progressStats({ version: roadmap.version, stages }, progress),
    };
  });
}
export const statusLabel: Record<string, string> = {
  planned: "计划中",
  in_progress: "进行中",
  completed: "已完成",
  submitted: "已提交",
  archived: "已归档",
};
export function excerpt(body: string) {
  return body
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\|/g, " ")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[#*`>\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

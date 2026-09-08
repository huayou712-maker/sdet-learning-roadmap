import "server-only";
import { cache } from "react";
import { repository } from "@/lib/github/contents";
import { entries } from "./service";
import type { Progress, Roadmap } from "@/lib/models";
import { AppError } from "@/lib/errors";
export const readEntries = cache(() => entries(repository()));
export const readLearning = cache(async () => {
  const repo = repository();
  const [r, p] = await Promise.all([
    repo.getTextFile("data/roadmap.json"),
    repo.getTextFile("data/progress.json"),
  ]);
  if (!r || !p)
    throw new AppError(503, "目标分支尚无学习数据，请先合并初始化 PR");
  return {
    roadmap: JSON.parse(r.content) as Roadmap,
    progress: JSON.parse(p.content) as Progress,
    sha: p.sha,
  };
});

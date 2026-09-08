import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import roadmap from "@/data/roadmap.json";
import progress from "@/data/progress.json";
import { progressStats, streak } from "@/lib/stats";
import type { Progress } from "@/lib/models";
describe("original learning data", () => {
  it("preserves every Stage 1–10 checklist item and state", () => {
    const source = readFileSync("docs/PROGRESS.md", "utf8").split(
      "# 求职准备",
    )[0];
    const checks = [...source.matchAll(/^- \[([ xX])\] (.+)$/gm)];
    const items = roadmap.stages.flatMap((s) =>
      s.groups.flatMap((g) => g.items),
    );
    expect(roadmap.stages).toHaveLength(10);
    expect(items.map((i) => i.title)).toEqual(checks.map((c) => c[2]));
    expect(progressStats(roadmap, progress as Progress).completed).toBe(
      checks.filter((c) => c[1] !== " ").length,
    );
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it("counts streak using distinct dates and yesterday grace", () => {
    expect(
      streak(["2026-09-07", "2026-09-06", "2026-09-06"], "2026-09-08"),
    ).toBe(2);
    expect(streak([], "2026-09-08")).toBe(0);
  });
});

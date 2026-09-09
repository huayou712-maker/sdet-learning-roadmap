import { describe, it, expect } from "vitest";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, relative, isAbsolute } from "node:path";
import { execFileSync } from "node:child_process";
import roadmap from "@/data/roadmap.json";
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
    expect(items).toHaveLength(checks.length);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it("initializes source state and preserves later GitHub progress on rerun", () => {
    const dir = mkdtempSync(join(tmpdir(), "sdet-migration-"));
    try {
      mkdirSync(join(dir, "docs"));
      for (const name of ["PROGRESS.md", "ROADMAP.md", "PROJECTS.md"])
        copyFileSync(join("docs", name), join(dir, "docs", name));
      const run = () =>
        execFileSync(process.execPath, [resolve("scripts/migrate.mjs")], {
          cwd: dir,
          stdio: "pipe",
        });
      run();
      const initial = JSON.parse(
        readFileSync(join(dir, "data/progress.json"), "utf8"),
      ) as Progress;
      const source = readFileSync("docs/PROGRESS.md", "utf8").split(
        "# 求职准备",
      )[0];
      expect(progressStats(roadmap, initial).completed).toBe(
        [...source.matchAll(/^- \[[xX]\]/gm)].length,
      );
      const key = Object.keys(initial.items)[0];
      initial.items[key].completed = true;
      initial.items[key].evidence = [{ type: "commit", id: "a".repeat(40) }];
      initial.updatedAt = "2026-09-08T00:00:00Z";
      writeFileSync(join(dir, "data/progress.json"), JSON.stringify(initial));
      const localCourse = JSON.parse(
        readFileSync(join(dir, "data/roadmap.json"), "utf8"),
      );
      localCourse.version = 99;
      localCourse.beginnerPath[0].title = "Preserve later course edits";
      writeFileSync(
        join(dir, "data/roadmap.json"),
        JSON.stringify(localCourse),
      );
      const localProjects = JSON.parse(
        readFileSync(join(dir, "data/projects.json"), "utf8"),
      );
      localProjects[0].body = "Preserve later project edits";
      writeFileSync(
        join(dir, "data/projects.json"),
        JSON.stringify(localProjects),
      );
      run();
      expect(
        JSON.parse(readFileSync(join(dir, "data/progress.json"), "utf8")),
      ).toEqual(initial);
      expect(
        JSON.parse(readFileSync(join(dir, "data/roadmap.json"), "utf8")),
      ).toEqual(localCourse);
      expect(
        JSON.parse(readFileSync(join(dir, "data/projects.json"), "utf8")),
      ).toEqual(localProjects);
    } finally {
      const rel = relative(tmpdir(), dir);
      if (
        rel &&
        !rel.startsWith("..") &&
        !isAbsolute(rel) &&
        rel.startsWith("sdet-migration-")
      )
        rmSync(dir, { recursive: true, force: true });
    }
  });
  it("counts streak using distinct dates and yesterday grace", () => {
    expect(
      streak(["2026-09-07", "2026-09-06", "2026-09-06"], "2026-09-08"),
    ).toBe(2);
    expect(streak([], "2026-09-08")).toBe(0);
  });
});

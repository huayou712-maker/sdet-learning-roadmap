import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { saveRecord, validateTopics } from "@/lib/content/learning-service";
import { entries } from "@/lib/content/service";
import { searchIndex } from "@/lib/search";
import { learningStats } from "@/lib/stats";
import { ProjectChecklist } from "@/components/learning/record-editor";
import type { Repository, TextFile } from "@/lib/github/types";
import { createHash } from "node:crypto";
import roadmap from "@/data/roadmap.json";
import projects from "@/data/projects.json";
import { projectChecks, projectAcceptance } from "@/lib/content/project-checks";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
function repo(): Repository {
  const files = new Map<string, TextFile>();
  const hash = (c: string) => createHash("sha1").update(c).digest("hex");
  return {
    getTextFile: async (p) => files.get(p) || null,
    listDirectory: async (p) =>
      [...files.keys()].filter((f) => f.startsWith(p + "/")),
    createTextFile: async (p, c) => {
      if (files.has(p)) throw new Error("conflict");
      files.set(p, { path: p, content: c, sha: hash(c) });
      return hash(c);
    },
    updateTextFile: async (p, s, c) => {
      if (files.get(p)?.sha !== s) throw new Error("conflict");
      files.set(p, { path: p, content: c, sha: hash(c) });
      return hash(c);
    },
    deleteFile: async () => "",
    getCommitsForPath: async () => [],
    getTextFileAtRef: async () => null,
    createBinaryFile: async () => "",
  };
}
it("explicitly saves an upgraded legacy project without losing checks, content or association", async () => {
  const r = await seeded();
  const definition = projects[4];
  const legacy = projects.map((p) =>
    p.id === definition.id
      ? {
          ...p,
          acceptance: undefined,
          checklist: p.acceptance.optional,
        }
      : p,
  );
  let defs = (await r.getTextFile("data/projects.json"))!;
  await r.updateTextFile(
    defs.path,
    defs.sha,
    JSON.stringify(legacy),
    "legacy seed",
  );
  const payload = {
    title: "CI old record",
    body: "Preserve learner explanation",
    stageId: "stage-08",
    projectNo: 4,
    topicIds: ["stage-08-826b6b2f2e"],
    tags: ["learner"],
    acknowledgedPublic: true,
    checklist: definition.acceptance.optional.map((title) => ({
      title,
      completed: true,
    })),
  };
  const result = await saveRecord(r, "project", payload);
  const old = (await entries(r)).find((e) => e.id === result.id)!;
  defs = (await r.getTextFile("data/projects.json"))!;
  await r.updateTextFile(
    defs.path,
    defs.sha,
    JSON.stringify(projects),
    "course upgrade",
  );
  const untouched = (await r.getTextFile(old.path))!;
  expect(untouched.sha).toBe(old.sha);
  const checks = projectChecks(definition, old.checklist);
  await saveRecord(
    r,
    "project",
    { ...payload, sha: old.sha, checklist: checks },
    old.id,
  );
  const saved = (await entries(r)).find((e) => e.id === old.id)!;
  expect(saved.id).toBe(old.id);
  expect(saved.createdAt).toBe(old.createdAt);
  expect(saved.body).toBe(old.body);
  expect(saved.topicIds).toEqual(old.topicIds);
  expect(saved.checklist.filter((c) => c.completed)).toEqual(old.checklist);
  expect(projectAcceptance(definition, saved.checklist).completed).toBe(0);
  await expect(
    saveRecord(
      r,
      "project",
      {
        ...payload,
        sha: saved.sha,
        checklist: [
          ...checks,
          { title: "invented criterion", completed: true },
        ],
      },
      old.id,
    ),
  ).rejects.toThrow("项目验收清单");
});
async function seeded() {
  const r = repo();
  await r.createTextFile("data/roadmap.json", JSON.stringify(roadmap), "seed");
  await r.createTextFile(
    "data/projects.json",
    JSON.stringify(projects),
    "seed",
  );
  return r;
}
const input = {
  title: "验收记录",
  stageId: "stage-04",
  body: "## 完成内容\n可验证输出",
  acknowledgedPublic: true,
};
it("assignment submissions are separate iterations, with immutable association", async () => {
  const r = await seeded();
  const first = await saveRecord(r, "assignment", {
    ...input,
    assignmentId: "project-0",
  });
  await saveRecord(r, "assignment", { ...input, assignmentId: "project-0" });
  const list = await entries(r);
  expect(list).toHaveLength(2);
  expect(list.map((e) => e.iteration).sort()).toEqual([1, 2]);
  expect(new Set(list.map((e) => e.path)).size).toBe(2);
  const e = list.find((e) => e.id === first.id)!;
  await expect(
    saveRecord(
      r,
      "assignment",
      { ...input, assignmentId: "project-1", stageId: "stage-05", sha: e.sha },
      e.id,
    ),
  ).rejects.toThrow();
});
it("daily is unique per valid date; project checklist must match source", async () => {
  const r = await seeded();
  await saveRecord(r, "daily", {
    ...input,
    date: "2026-09-08",
    actualMinutes: 60,
  });
  await expect(
    saveRecord(r, "daily", { ...input, date: "2026-09-08" }),
  ).rejects.toThrow("conflict");
  await expect(
    saveRecord(r, "daily", { ...input, date: "2026-02-30" }),
  ).rejects.toThrow();
  await expect(
    saveRecord(r, "project", { ...input, projectNo: 0, checklist: [] }),
  ).rejects.toThrow("验收清单");
  await saveRecord(r, "project", {
    ...input,
    projectNo: 0,
    checklist: projects[0].checklist.map((title) => ({
      title,
      completed: false,
    })),
  });
  expect(
    (await entries(r)).some(
      (e) => e.path === "content/project-submissions/project-0.md",
    ),
  ).toBe(true);
});
it("rejects cross-stage topic associations and unsafe project paths", async () => {
  const r = await seeded();
  await expect(
    validateTopics(r, "stage-04", [roadmap.stages[0].groups[0].items[0].id]),
  ).rejects.toThrow();
  await expect(
    saveRecord(r, "project", {
      ...input,
      projectNo: 0,
      repositoryPath: "projects/../secret",
      checklist: projects[0].checklist.map((title) => ({
        title,
        completed: false,
      })),
    }),
  ).rejects.toThrow();
});
it("search visibility and statistics exclude deleted records and do not double-count note time", async () => {
  const r = await seeded();
  await saveRecord(r, "daily", {
    ...input,
    title: "unique daily",
    date: "2026-09-08",
    actualMinutes: 60,
    durationMinutes: 90,
  });
  const list = await entries(r);
  expect(searchIndex(list, roadmap, "unique", false)).toHaveLength(0);
  expect(searchIndex(list, roadmap, "unique", true)).toHaveLength(1);
  expect(learningStats(list, "2026-09-08")).toMatchObject({
    minutes: 60,
    streak: 1,
  });
  expect(
    learningStats(
      list.map((e) => ({ ...e, deletedAt: "2026-09-08" })),
      "2026-09-08",
    ).minutes,
  ).toBe(0);
});
it("project checklist is readonly publicly and interactive for owner", () => {
  const changed = vi.fn();
  const { rerender } = render(
    <ProjectChecklist items={[{ title: "GET 请求", completed: false }]} />,
  );
  expect(screen.getByRole("checkbox")).toBeDisabled();
  rerender(
    <ProjectChecklist
      items={[{ title: "GET 请求", completed: false }]}
      onChange={changed}
    />,
  );
  fireEvent.click(screen.getByRole("checkbox"));
  expect(changed).toHaveBeenCalledWith([
    { title: "GET 请求", completed: true },
  ]);
});

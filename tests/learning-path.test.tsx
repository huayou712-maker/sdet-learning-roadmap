import { it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { render, screen, fireEvent } from "@testing-library/react";
import roadmap from "@/data/roadmap.json";
import projects from "@/data/projects.json";
import {
  nextBeginnerTask,
  nextLearningTopic,
  taskProgress,
} from "@/lib/learning-path";
import { projectChecks, projectAcceptance } from "@/lib/content/project-checks";
import { BeginnerPath } from "@/components/roadmap/beginner-path";
import { ProjectChecklist } from "@/components/learning/record-editor";
import type { Progress } from "@/lib/models";

it("retains every original stable topic ID and references only real, unique topics", () => {
  const ids = new Set<string>();
  for (const stage of roadmap.stages) {
    for (const group of stage.groups) {
      for (const item of group.items) {
        const digest = createHash("sha256")
          .update(group.title + item.title)
          .digest("hex")
          .slice(0, 10);
        expect(item.id).toBe(stage.id + "-" + digest);
        ids.add(item.id);
      }
    }
  }
  expect(ids.size).toBe(150);
  expect(new Set(roadmap.beginnerPath.map((t) => t.id)).size).toBe(6);
  for (const task of roadmap.beginnerPath) {
    expect(task.topicIds.length).toBeGreaterThan(0);
    expect(new Set(task.topicIds).size).toBe(task.topicIds.length);
    for (const id of task.topicIds) expect(ids.has(id)).toBe(true);
    expect(existsSync(task.guidePath)).toBe(true);
    expect(task.acceptance.length).toBeGreaterThan(0);
  }
});

it("recommends Python diagnosis then test design, with CI before SQL and UI", () => {
  const progress: Progress = { version: 1, updatedAt: null, items: {} };
  expect(nextBeginnerTask(roadmap, progress)?.id).toBe("start");
  expect(nextLearningTopic(roadmap, progress)?.stage.id).toBe("stage-02");
  for (const id of roadmap.beginnerPath[0].topicIds)
    progress.items[id] = {
      completed: true,
      completedAt: "2026-09-09",
      evidence: [],
    };
  const before = structuredClone(progress);
  expect(nextBeginnerTask(roadmap, progress)?.id).toBe("design");
  expect(nextLearningTopic(roadmap, progress)?.stage.id).toBe("stage-04");
  expect(taskProgress(roadmap.beginnerPath[0], progress).withEvidence).toBe(0);
  expect(progress).toEqual(before);
  expect(roadmap.beginnerPath.map((t) => t.id)).toEqual([
    "start",
    "design",
    "api",
    "ci",
    "data",
    "ui",
  ]);
});

it("supports legacy roadmaps and all-complete progress without inventing new state", () => {
  const progress: Progress = { version: 1, updatedAt: null, items: {} };
  expect(
    nextBeginnerTask({ version: 1, stages: roadmap.stages }, progress),
  ).toBeUndefined();
  for (const s of roadmap.stages)
    for (const i of s.groups.flatMap((g) => g.items))
      progress.items[i.id] = {
        completed: true,
        completedAt: null,
        evidence: [],
      };
  expect(nextBeginnerTask(roadmap, progress)).toBeUndefined();
  expect(nextLearningTopic(roadmap, progress)).toBeUndefined();
});

it("partitions every project criterion exactly once and keeps docs aligned", () => {
  const doc = readFileSync("docs/PROJECTS.md", "utf8");
  for (const p of projects) {
    const categories = [
      ...p.acceptance.required,
      ...p.acceptance.optional,
      ...p.acceptance.choices.flatMap((g) => g.items),
    ];
    expect([...categories].sort()).toEqual([...p.checklist].sort());
    expect(new Set(categories).size).toBe(categories.length);
    for (const group of p.acceptance.choices) {
      expect(group.minimum).toBeGreaterThan(0);
      expect(group.minimum).toBeLessThanOrEqual(group.items.length);
    }
    expect(doc).toContain(p.body.trim());
  }
});

it("counts required items and one satisfied choice group, not every business or bonus", () => {
  const p = projects[0];
  const checks = projectChecks(p).map((c) => ({
    ...c,
    completed: p.acceptance.required.includes(c.title) || c.title === "注册",
  }));
  expect(projectAcceptance(p, checks).passed).toBe(true);
  expect(checks.find((c) => c.title === "登录")?.completed).toBe(false);
  const api = projects[1];
  const bonus = api.acceptance.optional.map((title) => ({
    title,
    completed: true,
  }));
  expect(projectAcceptance(api, bonus).completed).toBe(0);
  const perf = projects[3];
  expect(
    projectAcceptance(perf, [{ title: "登录接口", completed: true }]).completed,
  ).toBe(0);
  expect(
    projectAcceptance(perf, [
      { title: "登录接口", completed: true },
      { title: "查询接口", completed: true },
    ]).completed,
  ).toBe(1);
});

it("keeps old CI bonuses and unknown historical checks without completing new requirements", () => {
  const p = projects[4];
  const saved = [...p.acceptance.optional, "historical-only"].map((title) => ({
    title,
    completed: true,
  }));
  const before = structuredClone(saved);
  const checks = projectChecks(p, saved);
  expect(saved).toEqual(before);
  expect(checks.filter((c) => c.completed)).toEqual(saved);
  expect(projectAcceptance(p, checks)).toEqual({
    completed: 0,
    total: 6,
    passed: false,
  });
  expect(projectChecks(p, checks)).toEqual(checks);
});

it("renders practical task instructions and grouped owner/public checklists", () => {
  const { unmount } = render(
    <BeginnerPath
      roadmap={roadmap}
      progress={{ version: 1, updatedAt: null, items: {} }}
    />,
  );
  expect(screen.getByText("环境与 Python 诊断")).toBeVisible();
  expect(
    screen.getByRole("link", { name: "入门指南与执行命令 →" }),
  ).toHaveAttribute("href", "/guide/beginner");
  expect(screen.getByText(/示例测试通过不会自动增加学习进度/)).toBeVisible();
  unmount();
  const p = projects[4],
    checks = projectChecks(p),
    onChange = vi.fn();
  const view = render(<ProjectChecklist definition={p} items={checks} />);
  expect(screen.getByRole("checkbox", { name: /^checkout$/ })).toBeDisabled();
  expect(
    screen.getByRole("heading", { name: "加分（不计入必做完成率）" }),
  ).toBeVisible();
  view.rerender(
    <ProjectChecklist definition={p} items={checks} onChange={onChange} />,
  );
  fireEvent.click(screen.getByRole("checkbox", { name: /^缓存 pip$/ }));
  const updated = onChange.mock.calls[0][0];
  expect(
    updated.find((c: { title: string }) => c.title === "缓存 pip").completed,
  ).toBe(true);
  expect(projectAcceptance(p, updated).completed).toBe(0);
});

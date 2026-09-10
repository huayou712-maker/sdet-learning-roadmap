import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { FocusReader } from "@/components/notes/focus-reader";
import { LearningBrief } from "@/components/dashboard/learning-brief";
import { ProjectEvidence } from "@/components/learning/project-evidence";
import { metaSchema, type Entry } from "@/lib/schemas/content";
import type { Progress } from "@/lib/models";
import roadmap from "@/data/roadmap.json";

it("focus mode toggles, exits with Escape and restores focus without storing state", () => {
  const storage = vi.spyOn(Storage.prototype, "setItem");
  try {
    const { unmount } = render(
      <FocusReader>
        <article>正文保持可读</article>
      </FocusReader>,
    );
    const toggle = screen.getByRole("button", { name: "专注阅读" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("article")).toBeVisible();
    expect(screen.getByRole("button", { name: "退出专注" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("link", { name: "← 知识库" })).toHaveAttribute(
      "href",
      "/notes",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    unmount();
    render(
      <FocusReader>
        <article>另一篇</article>
      </FocusReader>,
    );
    expect(screen.getByRole("button", { name: "专注阅读" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(storage).not.toHaveBeenCalled();
  } finally {
    storage.mockRestore();
  }
});

it("focus Escape does not intercept an open dialog or a handled keyboard event", () => {
  const { rerender } = render(
    <FocusReader>
      <dialog open>现有对话框</dialog>
    </FocusReader>,
  );
  fireEvent.click(screen.getByRole("button", { name: "专注阅读" }));
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.getByRole("button", { name: "退出专注" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  rerender(
    <FocusReader>
      <button onKeyDown={(e) => e.preventDefault()}>子控件</button>
    </FocusReader>,
  );
  fireEvent.keyDown(screen.getByRole("button", { name: "子控件" }), {
    key: "Escape",
  });
  expect(screen.getByRole("button", { name: "退出专注" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

it("learning brief uses actual task completion/evidence without mutating data", () => {
  const task = roadmap.beginnerPath[0];
  const progress: Progress = {
    version: 1,
    updatedAt: null,
    items: {
      [task.topicIds[0]]: { completed: true, completedAt: null, evidence: [] },
      [task.topicIds[1]]: {
        completed: true,
        completedAt: null,
        evidence: [{ type: "note", id: "note-one" }],
      },
    },
  };
  const before = structuredClone(progress);
  render(
    <LearningBrief
      task={task}
      current={roadmap.stages[1]}
      progress={progress}
      missingEvidence={1}
      owner={false}
    />,
  );
  const region = screen.getByRole("region", { name: "当前学习入口" });
  expect(within(region).getByLabelText("当前任务记录")).toHaveTextContent(
    `知识点已完成 2 / ${task.topicIds.length}其中有证据 1`,
  );
  expect(
    within(region).getByRole("link", { name: "进入阶段工作区 →" }),
  ).toHaveAttribute("href", "/roadmap#task-start");
  expect(screen.getByRole("link", { name: /阅读学习笔记/ })).toHaveAttribute(
    "href",
    "/notes",
  );
  expect(screen.queryByRole("link", { name: /写学习笔记/ })).toBeNull();
  for (const item of task.acceptance)
    expect(screen.getByText(item)).toBeInTheDocument();
  expect(progress).toEqual(before);
});

it("owner action links use existing routes and legacy/all-complete tasks remain readable", () => {
  render(
    <LearningBrief
      current={roadmap.stages[9]}
      progress={{ version: 1, updatedAt: null, items: {} }}
      missingEvidence={0}
      owner
    />,
  );
  expect(screen.getByRole("link", { name: /写学习笔记/ })).toHaveAttribute(
    "href",
    "/notes/new",
  );
  expect(screen.getByRole("link", { name: "进入训练台 ↗" })).toHaveAttribute(
    "href",
    "/training",
  );
  expect(
    screen.getByText("当前路线已完成，回顾并补充学习证据。"),
  ).toBeVisible();
  expect(screen.queryByLabelText("当前任务记录")).toBeNull();
});

const record = (overrides: Partial<Entry> = {}): Entry => ({
  ...metaSchema.parse({
    id: "project-2",
    type: "project",
    title: "合成项目",
    stageId: "stage-05",
    createdAt: "2026-09-09",
    updatedAt: "2026-09-09",
    deletedAt: null,
    showInPortfolio: true,
  }),
  body: "合成验收内容",
  path: "content/projects/project-2.md",
  sha: "a".repeat(40),
  ...overrides,
});

it("project evidence preserves supplied links and labels them as unverified", () => {
  const entry = record({
    repositoryPath: "projects/example",
    externalRepository: "https://github.com/example/example",
    reportUrl: "https://example.com/report",
    demoUrl: "https://example.com/demo",
  });
  render(<ProjectEvidence entry={entry} entries={[]} branch="main" />);
  expect(screen.getByRole("link", { name: "仓库内代码 ↗" })).toHaveAttribute(
    "href",
    "https://github.com/huayou712-maker/sdet-learning-roadmap/tree/main/projects/example",
  );
  expect(screen.getByRole("link", { name: "外部仓库 ↗" })).toHaveAttribute(
    "href",
    entry.externalRepository,
  );
  expect(screen.getByRole("link", { name: "测试报告 ↗" })).toHaveAttribute(
    "href",
    entry.reportUrl,
  );
  expect(screen.getByRole("link", { name: "演示 ↗" })).toHaveAttribute(
    "href",
    entry.demoUrl,
  );
  expect(screen.getByText("已提供链接 · 未自动验真")).toBeVisible();
});

it("project evidence reports missing artifacts and excludes private/deleted/unrelated debug entries", () => {
  const debug = record({
    id: "debug-visible",
    title: "公开复盘",
    type: "debug",
    projectId: "project-2",
  });
  render(
    <ProjectEvidence
      entry={record()}
      entries={[
        debug,
        { ...debug, id: "private", title: "私有复盘", showInPortfolio: false },
        { ...debug, id: "deleted", title: "删除复盘", deletedAt: "2026-09-09" },
        {
          ...debug,
          id: "unrelated",
          title: "其他项目",
          projectId: "project-3",
        },
      ]}
      branch="main"
    />,
  );
  expect(screen.getByText("尚未提供代码位置")).toBeVisible();
  expect(screen.getByText("尚未提供报告")).toBeVisible();
  expect(screen.getByRole("link", { name: "公开复盘 ↗" })).toHaveAttribute(
    "href",
    "/debug-journal/debug-visible",
  );
  for (const title of ["私有复盘", "删除复盘", "其他项目"])
    expect(screen.queryByText(title, { exact: false })).toBeNull();
});

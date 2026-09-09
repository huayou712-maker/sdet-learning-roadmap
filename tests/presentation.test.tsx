import { it, expect } from "vitest";
import { StrictMode } from "react";
import { Markdown } from "@/components/ui/markdown";
import { render, screen } from "@testing-library/react";
import { documentSections } from "@/lib/presentation";
import { resourceSections } from "@/lib/resource-view";
import {
  AssignmentList,
  AssignmentDetail,
} from "@/components/learning/assignments";
import { DebugDocument } from "@/components/learning/journals";
import { metaSchema, type Entry } from "@/lib/schemas/content";
it("heading anchors stay stable under React StrictMode", () => {
  render(
    <StrictMode>
      <Markdown body={"## 标题\n\n正文\n\n## 后记"} anchors />
    </StrictMode>,
  );
  expect(screen.getByRole("heading", { name: "标题" })).toHaveAttribute(
    "id",
    "section-1",
  );
  expect(screen.getByRole("heading", { name: "后记" })).toHaveAttribute(
    "id",
    "section-5",
  );
  expect(
    documentSections("## 标题\n\n正文\n\n## 后记").map((s) => s.id),
  ).toEqual(["section-1", "section-5"]);
});
const entry = (overrides: Partial<Entry> = {}): Entry => ({
  ...metaSchema.parse({
    id: "submission-1",
    type: "assignment",
    title: "接口作业",
    stageId: "stage-05",
    status: "submitted",
    createdAt: "2026-09-08",
    updatedAt: "2026-09-08",
    deletedAt: null,
  }),
  body: "## 根因\n\n连接未关闭",
  path: "content/test.md",
  sha: "a".repeat(40),
  assignmentId: "project-1",
  iteration: 1,
  ...overrides,
});
it("extracts actual Markdown sections without treating fenced code as headings", () => {
  expect(
    documentSections(
      "## 现象\n文本\n```md\n## not heading\n```\n## 根因\n超时",
    ).map((s) => s.title),
  ).toEqual(["现象", "根因"]);
});
it("resource classification preserves URLs and maps source topics without stored state", () => {
  const [resource] = resourceSections(
    "# 清单\n# 10. 接口自动化\n## 课程\nhttps://github.com/example/repo",
  );
  expect(resource.stage).toBe("stage-05");
  expect(resource.types).toEqual(["code"]);
  expect(resource.urls).toEqual(["https://github.com/example/repo"]);
  expect(resource).not.toHaveProperty("status");
});
it("assignment table is semantic and public has no iteration control", () => {
  render(
    <AssignmentList
      entries={[entry()]}
      projects={[]}
      owner={false}
      query={{ status: "submitted" }}
    />,
  );
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "接口作业" })).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "新迭代" }),
  ).not.toBeInTheDocument();
});
it("assignment status filtering excludes nonmatching rows", () => {
  render(
    <AssignmentList
      entries={[entry()]}
      projects={[]}
      owner={false}
      query={{ status: "completed" }}
    />,
  );
  expect(
    screen.queryByRole("link", { name: "接口作业" }),
  ).not.toBeInTheDocument();
});
it("submission history keeps distinct versions in descending order", () => {
  render(
    <AssignmentDetail
      entry={entry()}
      entries={[entry(), entry({ id: "submission-2", iteration: 2 })]}
      owner={false}
    />,
  );
  const links = screen.getAllByRole("link", { name: /Submission #/ });
  expect(links[0]).toHaveTextContent("#2");
  expect(links[1]).toHaveTextContent("#1");
});
it("debug document has eight explicit steps and retains original body", () => {
  render(<DebugDocument entry={entry({ type: "debug" })} />);
  expect(
    screen
      .getAllByRole("heading", { level: 2 })
      .slice(0, 8)
      .map((e) => e.textContent),
  ).toEqual([
    "现象",
    "上下文",
    "假设",
    "排查过程",
    "根因",
    "修复",
    "验证",
    "预防",
  ]);
  expect(screen.getByText("完整原文（含附加记录）")).toBeInTheDocument();
});

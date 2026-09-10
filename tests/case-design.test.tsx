import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CaseDesigner } from "@/components/training/case-designer";
import {
  blankCase,
  caseDesignSchema,
  caseFields,
  caseIssues,
  designAssignment,
  designMarkdown,
  type CaseRow,
} from "@/lib/training/case-design";
import { draftKey } from "@/lib/training/drafts";
const project = { id: "project-0", stageId: "stage-01" };
const filled = (id = "case-1"): CaseRow => ({
  ...blankCase(id),
  category: "duplicate",
  name: "重复注册",
  preconditions: "已存在用户",
  input: "用同名 username 再次请求",
  status: "409",
  response: "username_taken",
  data: "保留原用户，数量为 1",
  reason: "验证重复请求和原记录不被覆盖",
});
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
it("checks required fields, not correctness or learner mastery", () => {
  expect(caseIssues(blankCase("case-1"))).toHaveLength(7);
  expect(caseIssues(filled())).toEqual([]);
  expect(caseIssues({ ...filled(), status: "999" })).toEqual(["预期状态码"]);
  expect(caseIssues({ ...filled(), status: "200" })).toEqual([]); // Completeness is not semantic grading.
});
it("bounds cases, fields and unique IDs", () => {
  expect(
    caseDesignSchema.safeParse({
      title: "设计",
      cases: Array.from({ length: 20 }, (_, i) => filled("case-" + i)),
    }).success,
  ).toBe(true);
  expect(
    caseDesignSchema.safeParse({
      title: "设计",
      cases: Array.from({ length: 21 }, (_, i) => filled("case-" + i)),
    }).success,
  ).toBe(false);
  expect(
    caseDesignSchema.safeParse({ title: "设计", cases: [filled(), filled()] })
      .success,
  ).toBe(false);
  expect(
    caseDesignSchema.safeParse({
      title: "设计",
      cases: [{ ...filled(), input: "x".repeat(501) }],
    }).success,
  ).toBe(false);
});
it("serializes literal user content and retains the disclosed hint provenance", () => {
  const markdown = designMarkdown({
    title: "边界",
    cases: [
      {
        ...filled(),
        consulted: true,
        input: "```\n<script>alert(1)</script>\n# 不是标题",
      },
    ],
  });
  expect(markdown).toContain("````text");
  expect(markdown).toContain("填写后已查看");
  expect(markdown).toContain("不代表已执行");
  expect(markdown).toContain("预期数据变化");
});
it("uses the existing assignment schema without progress or training writes", () => {
  const result = designAssignment(
    { title: "我的用例", cases: [filled()] },
    project,
    true,
  );
  expect(result).toMatchObject({
    assignmentId: "project-0",
    stageId: "stage-01",
    status: "submitted",
    showInPortfolio: false,
    topicIds: [],
  });
  expect(result).not.toHaveProperty("progress");
  expect(() =>
    designAssignment(
      { title: "我的用例", cases: [blankCase("case-1")] },
      project,
      true,
    ),
  ).toThrow();
  expect(() =>
    designAssignment({ title: "我的用例", cases: [filled()] }, project, false),
  ).toThrow();
  expect(() =>
    designAssignment(
      {
        title: "我的用例",
        cases: [{ ...filled(), reason: "github_pat_" + "x".repeat(40) }],
      },
      project,
      true,
    ),
  ).toThrow();
});
function fill() {
  fireEvent.change(screen.getByLabelText("作业标题"), {
    target: { value: "注册接口边界设计" },
  });
  const row = within(screen.getByRole("group", { name: "用例 1" }));
  for (const [key, label] of Object.entries(caseFields))
    fireEvent.change(row.getByLabelText(label), {
      target: { value: filled()[key as keyof typeof caseFields] },
    });
}
it("gates hints on written expectations and saves only after explicit submit", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(
        JSON.stringify({ id: "assignment-r7", commit: "a".repeat(40) }),
      ),
    );
  render(<CaseDesigner project={project} acknowledged disabled={false} />);
  expect(screen.getByText("填写后对照提示")).toBeDisabled();
  fill();
  expect(fetch).not.toHaveBeenCalled();
  expect(localStorage.length).toBe(0);
  fireEvent.click(screen.getByText("填写后对照提示"));
  expect(screen.getByText("对照检查，不是标准答案")).toBeVisible();
  fireEvent.click(screen.getByText("保存本机草稿"));
  expect(localStorage.getItem(draftKey("case-design"))).not.toBeNull();
  fireEvent.submit(screen.getByRole("form", { name: "注册用例设计" }));
  await vi.waitFor(() =>
    expect(screen.getByText("查看已提交记录 →")).toBeVisible(),
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe("/api/assignments");
  const request = JSON.parse(fetch.mock.calls[0][1]?.body as string);
  expect(request.body).toContain("填写后已查看");
  expect(localStorage.getItem(draftKey("case-design"))).toBeNull();
  expect(screen.getByText("提交为 Project 0 作业")).toBeDisabled();
});
it("retains uncertain submissions and requires manual verification before retry", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new TypeError("network"));
  render(<CaseDesigner project={project} acknowledged disabled={false} />);
  fill();
  fireEvent.submit(screen.getByRole("form", { name: "注册用例设计" }));
  await vi.waitFor(() =>
    expect(screen.getByText(/提交结果待核对/)).toBeVisible(),
  );
  expect(screen.getByLabelText("用例名称")).toHaveValue("重复注册");
  expect(screen.getByText("提交为 Project 0 作业")).toBeDisabled();
  fireEvent.submit(screen.getByRole("form", { name: "注册用例设计" }));
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("我已核对没有新增记录，允许重试"));
  expect(screen.getByText("提交为 Project 0 作业")).toBeEnabled();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("does not submit without public acknowledgement or Project 0", () => {
  render(<CaseDesigner acknowledged={false} disabled={false} />);
  fill();
  expect(screen.getByText("提交为 Project 0 作业")).toBeDisabled();
  expect(screen.getByText(/Project 0 定义不可用/)).toBeVisible();
});

import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AttemptComparison } from "@/components/training/attempt-comparison";
import { VerifyCI } from "@/components/training/ci-verification";
import {
  attemptPair,
  boundPair,
  prepareComparison,
  comparisonRows,
  comparisonMarkdown,
  comparisonRecord,
} from "@/lib/training/attempt-comparison";
import { draftKey } from "@/lib/training/drafts";
import { practiceAttempt } from "./helpers/verification-fixture";
import { documentSections } from "@/lib/presentation";
const earlier = practiceAttempt();
const later = practiceAttempt({
  id: "88888888-8888-4888-8888-888888888888",
  commitSha: "b".repeat(40),
  recordedAt: "2026-09-11T00:00:00Z",
  faults: { age: "detected", duplicate: "detected", status: "not_run" },
});
const attempts = [earlier, later];
const project = { id: "project-0", stageId: "stage-01" };
const filled = () => {
  const value = prepareComparison(earlier, later);
  value.fields.phenomenon = "年龄边界测试漏检";
  value.fields.investigation = "查看 17 与 18 的响应和状态";
  value.fields.validation = "补充断言后对照自己的两份记录，仍需核对报告";
  return value;
};
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
it("requires different ordered existing attempts and pins the source version", () => {
  expect(attemptPair(attempts, earlier.id, later.id)).toEqual({
    before: earlier,
    after: later,
  });
  expect(attemptPair(attempts, later.id, earlier.id)).toBeNull();
  expect(attemptPair(attempts, earlier.id, earlier.id)).toBeNull();
  expect(attemptPair(attempts, "missing", later.id)).toBeNull();
  expect(
    attemptPair(
      [{ ...earlier, recordedAt: "2027-01-01T00:00:00Z" }, later],
      earlier.id,
      later.id,
    ),
  ).toBeNull();
  expect(
    boundPair([earlier, { ...later, commitSha: "c".repeat(40) }], filled()),
  ).toBeNull();
});
it("shows only self-reported changes, including unchanged and regressed results", () => {
  const rows = comparisonRows(earlier, later);
  expect(rows[1]).toMatchObject({
    before: "漏检",
    after: "检出",
    changed: true,
  });
  expect(rows[2].changed).toBe(false);
  expect(comparisonRows(later, earlier)[1]).toMatchObject({
    before: "检出",
    after: "漏检",
  });
  expect(rows[3]).toMatchObject({
    before: "未验证",
    after: "未验证",
    changed: false,
  });
});
it("creates an ordinary in-progress debug with explicit evidence and no invented cause", () => {
  const original = structuredClone(attempts),
    value = filled();
  value.category = "边界";
  const record = comparisonRecord(value, attempts, project, ["边界"], true);
  expect(record).toMatchObject({
    status: "in_progress",
    projectId: "project-0",
    topicIds: [],
    tags: ["边界"],
    showInPortfolio: false,
  });
  expect(record.body).toContain("结果为学习者自报");
  expect(
    documentSections(record.body).find(
      (section) => section.title === "验证结果",
    )?.body,
  ).toContain("结果为学习者自报");
  expect(record.body).toContain("待补充，尚未得出结论");
  expect(record.body).toContain(
    "/compare/" + earlier.commitSha + "..." + later.commitSha,
  );
  expect(record.body).not.toContain("已掌握");
  expect(attempts).toEqual(original);
  expect(() => comparisonRecord(value, attempts, project, [], true)).toThrow();
  expect(() =>
    comparisonRecord(filled(), attempts, project, [], false),
  ).toThrow();
});
it("rejects incomplete or secret-bearing submissions and escapes literal Markdown", () => {
  const value = filled();
  value.fields.cause = "github_pat_" + "x".repeat(40);
  expect(() => comparisonMarkdown(value, attempts)).toThrow();
  value.fields.cause = "~~~\n<script>bad</script>\n```";
  expect(comparisonMarkdown(value, attempts)).toContain("````text");
  value.fields.validation = "";
  expect(() => comparisonRecord(value, attempts, project, [], true)).toThrow();
});
it.each([{ records: [] }, { records: [earlier] }])(
  "renders honest empty state without generating a grade for $records",
  ({ records }) => {
    render(
      <AttemptComparison
        attempts={records}
        project={project}
        acknowledged
        disabled={false}
      />,
    );
    expect(screen.getByText("至少需要两次练习记录")).toBeVisible();
    expect(screen.queryByText("提交为排障记录")).toBeNull();
  },
);
function prepare() {
  fireEvent.click(screen.getByText("准备排障草稿"));
  for (const [label, value] of Object.entries({
    现象: "年龄边界漏检",
    排查过程: "查看状态码并逐条运行自己的断言",
    验证结果: "两份自报不同，尚待报告证据核对",
  }))
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
it("does not render duplicate readonly evidence in an inactive tab, but preserves edited form state", () => {
  const view = render(
    <AttemptComparison
      attempts={attempts}
      project={project}
      acknowledged
      disabled={false}
      active={false}
    />,
  );
  expect(screen.queryByText(earlier.reflection)).toBeNull();
  view.rerender(
    <AttemptComparison
      attempts={attempts}
      project={project}
      acknowledged
      disabled={false}
    />,
  );
  prepare();
  view.rerender(
    <AttemptComparison
      attempts={attempts}
      project={project}
      acknowledged
      disabled={false}
      active={false}
    />,
  );
  expect(screen.queryByText(earlier.reflection)).toBeNull();
  expect(screen.getByLabelText("现象")).toHaveValue("年龄边界漏检");
});
it("preserves dirty input when selection change is cancelled and stores no formal snapshot", () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(
    <AttemptComparison
      attempts={attempts}
      project={project}
      acknowledged
      disabled={false}
    />,
  );
  prepare();
  fireEvent.change(screen.getByLabelText("较早尝试"), {
    target: { value: later.id },
  });
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByLabelText("较早尝试")).toHaveValue(earlier.id);
  fireEvent.click(screen.getByText("保存本机草稿"));
  const data = JSON.parse(
    localStorage.getItem(draftKey("attempt-comparison"))!,
  ).payload;
  expect(Object.keys(data).sort()).toEqual([
    "category",
    "fields",
    "pair",
    "title",
  ]);
  expect(data).not.toHaveProperty("attempts");
  expect(JSON.stringify(data)).not.toContain(earlier.reflection);
  expect(fetch).not.toHaveBeenCalled();
});
it("refuses restored drafts whose original attempts no longer exist", () => {
  const first = render(
    <AttemptComparison
      attempts={attempts}
      project={project}
      acknowledged
      disabled={false}
    />,
  );
  prepare();
  fireEvent.click(screen.getByText("保存本机草稿"));
  first.unmount();
  render(
    <AttemptComparison
      attempts={[later]}
      project={project}
      acknowledged
      disabled={false}
    />,
  );
  fireEvent.click(screen.getByText("恢复本机草稿"));
  expect(screen.getByText(/草稿已过期、损坏/)).toBeVisible();
  expect(screen.queryByRole("form")).toBeNull();
});
it("submits debug only on explicit confirmation and clears only its own draft", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify({ id: "r7-debug", commit: "a".repeat(40) })),
    );
  render(
    <AttemptComparison
      attempts={attempts}
      project={project}
      acknowledged
      disabled={false}
    />,
  );
  prepare();
  fireEvent.click(screen.getByText("保存本机草稿"));
  fireEvent.submit(screen.getByRole("form", { name: "失败对照排障草稿" }));
  await vi.waitFor(() =>
    expect(screen.getByText("查看已提交记录 →")).toBeVisible(),
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe("/api/debug-journal");
  expect(screen.getByText("提交为排障记录")).toBeDisabled();
  expect(localStorage.getItem(draftKey("attempt-comparison"))).toBeNull();
});
it("keeps failed debug input and blocks blind duplicate retry", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new TypeError("offline"));
  render(
    <AttemptComparison
      attempts={attempts}
      project={project}
      acknowledged
      disabled={false}
    />,
  );
  prepare();
  fireEvent.submit(screen.getByRole("form", { name: "失败对照排障草稿" }));
  await vi.waitFor(() =>
    expect(screen.getByText(/提交结果待核对/)).toBeVisible(),
  );
  expect(screen.getByLabelText("现象")).toHaveValue("年龄边界漏检");
  fireEvent.submit(screen.getByRole("form", { name: "失败对照排障草稿" }));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByText("提交为排障记录")).toBeDisabled();
});
it("CI UI never polls, persists or double-posts and refuses malformed results", async () => {
  let resolve!: (response: Response) => void;
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      }),
  );
  render(<VerifyCI attemptId={earlier.id} />);
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("核对 CI 来源与版本"));
  fireEvent.click(screen.getByText("正在核对 CI…"));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
    attemptId: earlier.id,
  });
  resolve(new Response(JSON.stringify({ grade: "mastered" })));
  await vi.waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("核验响应不完整"),
  );
  expect(localStorage.length).toBe(0);
  expect(fetch).toHaveBeenCalledTimes(1);
});

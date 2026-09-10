import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CommandBlock } from "@/components/training/command-block";
import { AttemptLedger } from "@/components/training/attempt-ledger";
import { SyncFeedback } from "@/components/training/sync-feedback";
import { Reviews } from "@/components/training/reviews";
import { StatePanel } from "@/components/ui/state-panel";
import ErrorPage from "@/app/error";
import Loading from "@/app/loading";
import NotFound from "@/app/not-found";
import {
  faults,
  REPOSITORY_URL,
  type Attempt,
  type Review,
} from "@/lib/training/schema";
import type { ReviewSource } from "@/lib/training/rules";

const clipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);
afterEach(() => {
  if (clipboardDescriptor)
    Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
  else Reflect.deleteProperty(navigator, "clipboard");
  vi.restoreAllMocks();
});

const command =
  ".\\.venv\\Scripts\\python.exe selfcheck.py tests/test_registration_practice.py";
it("copies the exact command only after explicit action without persisting or executing it", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const fetch = vi.spyOn(globalThis, "fetch");
  render(
    <CommandBlock title="故障自检" command={command}>
      核对目标断言。
    </CommandBlock>,
  );
  expect(writeText).not.toHaveBeenCalled();
  expect(screen.getByLabelText("故障自检命令")).toHaveTextContent(command);
  fireEvent.click(screen.getByRole("button", { name: "复制故障自检命令" }));
  expect(await screen.findByRole("status")).toHaveTextContent("命令已复制");
  expect(writeText).toHaveBeenCalledExactlyOnceWith(command);
  expect(storage).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it.each(["denied", "missing"])(
  "keeps commands manually selectable when clipboard is %s",
  async (reason) => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value:
        reason === "missing"
          ? undefined
          : {
              writeText: vi
                .fn()
                .mockRejectedValue(new Error("permission denied")),
            },
    });
    render(
      <CommandBlock title="故障自检" command={command}>
        核对目标断言。
      </CommandBlock>,
    );
    const button = screen.getByRole("button", { name: "复制故障自检命令" });
    fireEvent.click(button);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "请手动选择并复制",
    );
    expect(screen.getByLabelText("故障自检命令")).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByLabelText("故障自检命令")).toHaveTextContent(command);
    expect(button).toBeEnabled();
  },
);

const attempt = (overrides: Partial<Attempt> = {}): Attempt => ({
  id: "ab794866-bcde-4160-a26c-c7d78c100f03",
  commitSha: "e".repeat(40),
  normal: "passed",
  faults: { age: "detected", duplicate: "missed", status: "not_run" },
  reflection: "合成复盘：下次补充重复注册后原记录不被覆盖的断言。",
  ciUrl: REPOSITORY_URL + "/actions/runs/123",
  recordedAt: "2026-09-10T10:00:00.000Z",
  provenance: "self_reported",
  ...overrides,
});

it("separates the latest attempt from reversible history without losing or mutating evidence", () => {
  const older = attempt({
    id: "cd794866-bcde-4160-a26c-c7d78c100f04",
    reflection: "较早的合成复盘：先检查正常实现。",
    recordedAt: "2026-09-09T10:00:00.000Z",
    commitSha: "d".repeat(40),
  });
  const latest = attempt();
  const attempts = [older, latest];
  const before = structuredClone(attempts);
  render(<AttemptLedger attempts={attempts} />);
  expect(screen.getByText(latest.reflection)).toBeVisible();
  expect(screen.getByText(older.reflection)).not.toBeVisible();
  const summary = screen.getByText("更早的练习记录（1）");
  fireEvent.click(summary);
  expect(screen.getByText(older.reflection)).toBeVisible();
  expect(
    screen
      .getAllByRole("link", { name: "核对代码版本 ↗" })
      .map((link) => link.getAttribute("href")),
  ).toEqual([
    REPOSITORY_URL + "/commit/" + latest.commitSha,
    REPOSITORY_URL + "/commit/" + older.commitSha,
  ]);
  expect(
    screen.getAllByRole("link", { name: "CI 运行链接（未核验）→" }),
  ).toHaveLength(2);
  fireEvent.click(summary);
  expect(screen.getByText(older.reflection)).not.toBeVisible();
  expect(attempts).toEqual(before);
  expect(
    screen.getAllByText("学习者自报 · 未自动验真", { exact: true }),
  ).toHaveLength(1);
});

it("keeps self-report counts honest and reuses only the applicable missed-fault guidance", () => {
  render(<AttemptLedger attempts={[attempt()]} />);
  expect(screen.getByText(/自报结果：检出 1 \/ 3 项/)).toBeVisible();
  fireEvent.click(screen.getByText("查看未检出项的检查提示"));
  expect(screen.getByText(faults[1].suggestion)).toBeVisible();
  expect(screen.getByText(faults[2].suggestion)).toBeVisible();
  expect(screen.queryByText(faults[0].suggestion)).toBeNull();
  expect(
    screen.getByRole("link", { name: "CI 运行链接（未核验）→" }),
  ).toHaveAttribute("href", REPOSITORY_URL + "/actions/runs/123");
});

it("explains a blocked baseline without presenting a pass or invented CI evidence", () => {
  render(
    <AttemptLedger
      attempts={[
        attempt({
          normal: "failed",
          faults: { age: "not_run", duplicate: "not_run", status: "not_run" },
          ciUrl: "",
        }),
      ]}
    />,
  );
  expect(
    screen.getByText("先让独立测试在正常实现上通过，再判断故障检出能力。"),
  ).toBeVisible();
  expect(screen.getByText(/自报结果：检出 0 \/ 3 项/)).toBeVisible();
  expect(screen.getByText("未附 CI 运行链接")).toBeVisible();
  expect(screen.queryByText("查看未检出项的检查提示")).toBeNull();
  expect(screen.queryByRole("link", { name: /CI 运行链接/ })).toBeNull();
});

it("provides an existing command entry point for empty evidence", () => {
  render(<AttemptLedger attempts={[]} />);
  expect(
    screen.getByRole("heading", { name: "还没有独立练习记录" }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "先查看执行命令 →" }),
  ).toHaveAttribute("href", "#practice-commands");
  expect(screen.queryByRole("article")).toBeNull();
});

it("distinguishes reads from writes and never combines errors with stale success or commit links", () => {
  const common = {
    busy: true,
    operation: "write" as const,
    error: "",
    message: "旧成功提示",
    commit: "a".repeat(40),
  };
  const { rerender } = render(<SyncFeedback {...common} />);
  expect(
    screen.getByRole("status", { name: "训练同步状态" }),
  ).toHaveTextContent("正在提交到 GitHub");
  expect(screen.queryByRole("link")).toBeNull();
  rerender(<SyncFeedback {...common} operation="read" />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "正在读取 GitHub 最新版本",
  );
  rerender(
    <SyncFeedback
      {...common}
      busy={false}
      error="上游读取失败"
      operation="read"
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("最新版本读取失败");
  expect(screen.getByRole("alert")).toHaveTextContent("上游读取失败");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  expect(screen.queryByText("旧成功提示")).toBeNull();
  expect(screen.queryByRole("link")).toBeNull();
  rerender(<SyncFeedback {...common} busy={false} error="提交响应中断" />);
  expect(screen.getByRole("alert")).toHaveTextContent("本次提交未确认成功");
  rerender(
    <SyncFeedback {...common} busy={false} message="已提交到 GitHub。" />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("已提交到 GitHub。");
  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    REPOSITORY_URL + "/commit/" + common.commit,
  );
  expect(screen.queryByRole("alert")).toBeNull();
});

it("exposes an honest busy fallback with decorative non-animated placeholders", () => {
  const { container } = render(<Loading />);
  expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  expect(
    screen.getByRole("heading", { name: "正在读取 GitHub 学习记录…" }),
  ).toBeVisible();
  expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByText(/\d+%/)).toBeNull();
});

it("retries the error boundary through retry, not reset, and does not disclose raw errors or promise draft survival", () => {
  const retry = vi.fn();
  const reset = vi.fn();
  const props = {
    retry,
    reset,
    error: new Error("private upstream diagnostic"),
  };
  render(<ErrorPage {...props} />);
  expect(screen.queryByText(/private upstream diagnostic/)).toBeNull();
  expect(screen.getByText(/未提交输入可能仅保存在页面内存中/)).toBeVisible();
  expect(screen.queryByText(/草稿.*不会丢失/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "重新读取" }));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(reset).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: "检查连接设置 →" })).toHaveAttribute(
    "href",
    "/settings",
  );
  expect(screen.getByRole("link", { name: "返回学习首页" })).toHaveAttribute(
    "href",
    "/",
  );
});

it("keeps not-found reasons indistinguishable and offers existing public destinations", () => {
  render(<NotFound />);
  expect(
    screen.getByText("记录不存在、已移入回收站，或未选择公开展示。"),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "浏览可见笔记 →" })).toHaveAttribute(
    "href",
    "/notes",
  );
  expect(screen.getByRole("link", { name: "返回学习首页" })).toHaveAttribute(
    "href",
    "/",
  );
});

it("supports compact semantic states without inventing controls or status assertions", () => {
  render(
    <StatePanel compact kind="restricted" title="受限区域">
      <p>需要所有者权限。</p>
    </StatePanel>,
  );
  expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
    "受限区域",
  );
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByRole("status")).toBeNull();
});

const source: ReviewSource = {
  id: "synthetic-note",
  type: "note",
  title: "合成来源",
  sha: "c".repeat(40),
  deletedAt: null,
};
const card: Review = {
  id: "fe794866-bcde-4160-a26c-c7d78c100f05",
  sourceId: source.id,
  sourceType: "note",
  sourceTitle: source.title,
  sourceSha: source.sha,
  kind: "concept",
  question: "合成问题：什么是边界值？",
  answer: "合成答案：检查边界与其相邻值。",
  createdAt: "2026-09-09T10:00:00.000Z",
  due: "2026-09-12",
  suspended: false,
  streak: 0,
  history: [],
};

it("explains unavailable review states while preserving schedules, history and source recovery", () => {
  const save = vi.fn();
  const props = {
    cards: [card],
    sources: [source],
    sourceId: "",
    cardId: "",
    today: "2026-09-10",
    disabled: false,
    save,
  };
  const before = structuredClone(card);
  const { rerender } = render(<Reviews {...props} />);
  const article = screen.getByRole("article", { name: card.question });
  expect(within(article).getByText(/尚未到复习日期/)).toBeVisible();
  expect(within(article).queryByLabelText("你的作答")).toBeNull();
  rerender(<Reviews {...props} cards={[{ ...card, suspended: true }]} />);
  expect(within(article).getByText(/恢复后将按原到期日继续安排/)).toBeVisible();
  const reviewed: Review = {
    ...card,
    history: [
      {
        ratedAt: "2026-09-10T10:00:00.000Z",
        grade: "hint",
        response: "合成作答",
        evidence: "",
        nextDue: "2026-09-13",
      },
    ],
    due: "2026-09-13",
  };
  rerender(<Reviews {...props} cards={[reviewed]} />);
  expect(within(article).getByText(/今天已记录自评/)).toBeVisible();
  fireEvent.click(within(article).getByText("查看复习历史（1）"));
  expect(within(article).getByText("合成作答")).toBeVisible();
  rerender(<Reviews {...props} sources={[]} />);
  expect(within(article).getByText(/来源已删除或不存在/)).toBeVisible();
  expect(save).not.toHaveBeenCalled();
  expect(card).toEqual(before);
});

it("routes empty review queues to a real source or the existing creation form", () => {
  const save = vi.fn();
  const props = {
    cards: [],
    sources: [],
    sourceId: "",
    cardId: "",
    today: "2026-09-10",
    disabled: false,
    save,
  };
  const { rerender } = render(<Reviews {...props} />);
  expect(
    screen.getByRole("link", { name: "先写一篇学习笔记 →" }),
  ).toHaveAttribute("href", "/notes/new");
  rerender(<Reviews {...props} sources={[source]} />);
  expect(
    screen.getByRole("link", { name: "从已有记录提取问题 →" }),
  ).toHaveAttribute("href", "#create-review");
  expect(screen.getByRole("form", { name: "创建复习卡" })).toBeVisible();
  expect(save).not.toHaveBeenCalled();
});

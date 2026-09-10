import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { z } from "zod";
import Link from "next/link";
import { Practice } from "@/components/training/practice";
import { Reviews } from "@/components/training/reviews";
import { SearchHighlight } from "@/components/ui/search-highlight";
import {
  decodeDraft,
  encodeDraft,
  DRAFT_TTL,
  draftKey,
  practiceDraftSchema,
} from "@/lib/training/drafts";
import { recommendTraining } from "@/lib/training/rules";
import { emptyTraining, type Review } from "@/lib/training/schema";
import { searchIndex, searchExcerpt, searchType } from "@/lib/search";
import { metaSchema, type Entry } from "@/lib/schemas/content";
import roadmap from "../data/roadmap.json";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
const now = Date.parse("2026-09-10T12:00:00Z");
const payload = () => ({
  id: crypto.randomUUID(),
  commitSha: "e".repeat(40),
  normal: "not_run" as const,
  faults: {
    age: "not_run" as const,
    duplicate: "not_run" as const,
    status: "not_run" as const,
  },
  reflection: "需要补充边界断言",
  ciUrl: "",
});
it("roundtrips only explicit draft fields with identity preserved", () => {
  const value = payload();
  const encoded = encodeDraft("practice", value, practiceDraftSchema, now);
  expect(
    decodeDraft(encoded.text, "practice", practiceDraftSchema, now).value,
  ).toEqual(value);
  expect(JSON.parse(encoded.text)).not.toHaveProperty("state");
});
it.each(["expired", "future", "scope", "corrupt", "extra"])(
  "rejects %s drafts",
  (reason) => {
    const record = JSON.parse(
      encodeDraft("practice", payload(), practiceDraftSchema, now).text,
    );
    if (reason === "expired") record.savedAt -= DRAFT_TTL;
    if (reason === "future") record.savedAt += 120000;
    if (reason === "scope") record.scope = "other";
    if (reason === "extra") record.payload.savedHistory = [];
    expect(() =>
      decodeDraft(
        reason === "corrupt" ? "{" : JSON.stringify(record),
        "practice",
        practiceDraftSchema,
        now,
      ),
    ).toThrow();
  },
);
it("blocks credential formats before encoding and again before restore", () => {
  const secret = "ghp_" + "x".repeat(36);
  expect(() =>
    encodeDraft(
      "practice",
      { ...payload(), reflection: secret },
      practiceDraftSchema,
      now,
    ),
  ).toThrow();
  const encoded = JSON.parse(
    encodeDraft("practice", payload(), practiceDraftSchema, now).text,
  );
  encoded.payload.reflection = secret;
  expect(() =>
    decodeDraft(JSON.stringify(encoded), "practice", practiceDraftSchema, now),
  ).toThrow();
});
it("bounds UTF-8 bytes rather than character count", () => {
  expect(() =>
    encodeDraft("large", "测".repeat(40000), z.string(), now),
  ).toThrow();
  expect(() =>
    decodeDraft(" ".repeat(100001), "large", z.string(), now),
  ).toThrow();
});
it("does not persist on typing; explicit restore preserves the pending request ID", async () => {
  const save = vi.fn().mockResolvedValue(false);
  const view = render(<Practice attempts={[]} disabled={false} save={save} />);
  fireEvent.change(screen.getByLabelText("复盘与下一步"), {
    target: { value: "独立练习，补充重复请求断言。" },
  });
  expect(localStorage.length).toBe(0);
  const tools = within(screen.getByLabelText("练习记录草稿工具"));
  fireEvent.click(tools.getByText("保存本机草稿"));
  const stored = JSON.parse(localStorage.getItem(draftKey("practice"))!);
  view.unmount();
  render(<Practice attempts={[]} disabled={false} save={save} />);
  expect(screen.getByLabelText("复盘与下一步")).toHaveValue("");
  fireEvent.click(
    within(screen.getByLabelText("练习记录草稿工具")).getByText("恢复本机草稿"),
  );
  expect(screen.getByLabelText("复盘与下一步")).toHaveValue(
    stored.payload.reflection,
  );
  fireEvent.submit(screen.getByRole("form", { name: "提交独立练习" }));
  await vi.waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0].attempt.id).toBe(stored.payload.id);
  expect(localStorage.getItem(draftKey("practice"))).not.toBeNull();
});
it("blocks navigation with dirty inputs and releases the guard on unmount", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const view = render(
    <>
      <Link href="/notes">离开练习</Link>
      <Practice attempts={[]} disabled={false} save={vi.fn()} />
    </>,
  );
  fireEvent.change(screen.getByLabelText("复盘与下一步"), {
    target: { value: "未提交的独立复盘" },
  });
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByText("离开练习"));
  expect(confirm).toHaveBeenCalledTimes(1);
  view.unmount();
  const clean = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
});
it("keeps another tab's newer draft on successful submit", async () => {
  const newer = encodeDraft(
    "practice",
    { ...payload(), reflection: "另一标签页的新草稿" },
    practiceDraftSchema,
  );
  const save = vi.fn().mockImplementation(async () => {
    localStorage.setItem(draftKey("practice"), newer.text);
    return true;
  });
  render(<Practice attempts={[]} disabled={false} save={save} />);
  fireEvent.change(screen.getByLabelText("复盘与下一步"), {
    target: { value: "本页待提交输入" },
  });
  fireEvent.click(
    within(screen.getByLabelText("练习记录草稿工具")).getByText("保存本机草稿"),
  );
  fireEvent.submit(screen.getByRole("form", { name: "提交独立练习" }));
  await vi.waitFor(() =>
    expect(screen.getByLabelText("复盘与下一步")).toHaveValue(""),
  );
  expect(localStorage.getItem(draftKey("practice"))).toBe(newer.text);
});
it("reports denied storage and sensitive drafts without exposing values", () => {
  render(<Practice attempts={[]} disabled={false} save={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("复盘与下一步"), {
    target: { value: "ghp_" + "a".repeat(36) },
  });
  fireEvent.click(
    within(screen.getByLabelText("练习记录草稿工具")).getByText("保存本机草稿"),
  );
  expect(localStorage.length).toBe(0);
  expect(screen.getByText(/草稿未保存/)).toBeVisible();
  fireEvent.change(screen.getByLabelText("复盘与下一步"), {
    target: { value: "无敏感内容的复盘" },
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  fireEvent.click(
    within(screen.getByLabelText("练习记录草稿工具")).getByText("保存本机草稿"),
  );
  expect(screen.getByText(/草稿未保存/)).toBeVisible();
});
const source = {
  id: "note-source",
  type: "note" as const,
  title: "边界",
  deletedAt: null,
  sha: "a".repeat(40),
};
const card = (i = 0): Review => ({
  id: "cf8da1ef-0000-4000-8000-" + String(i).padStart(12, "0"),
  sourceId: source.id,
  sourceType: "note",
  sourceTitle: source.title,
  sourceSha: source.sha,
  question: "为什么应检查数据变化 " + i,
  answer: "核对副作用与状态码。",
  kind: "concept",
  createdAt: "2026-09-09T00:00:00Z",
  due: "2026-09-10",
  suspended: false,
  streak: 0,
  history: [],
});
it("locks an explicitly saved response when revealing and keeps it locked after restore", () => {
  const props = {
    cards: [card()],
    sources: [source],
    sourceId: "",
    cardId: "",
    today: "2026-09-10",
    disabled: false,
    save: vi.fn(),
  };
  const view = render(<Reviews {...props} />);
  fireEvent.change(screen.getByLabelText("你的作答"), {
    target: { value: "我应断言数据没有变化。" },
  });
  fireEvent.click(
    within(screen.getByLabelText("本次作答草稿工具")).getByText("保存本机草稿"),
  );
  fireEvent.click(screen.getByText("展开参考答案"));
  expect(screen.getByLabelText("你的作答")).toBeDisabled();
  expect(
    within(screen.getByLabelText("本次作答草稿工具")).getByText("恢复本机草稿"),
  ).toBeDisabled();
  view.unmount();
  render(<Reviews {...props} />);
  fireEvent.click(
    within(screen.getByLabelText("本次作答草稿工具")).getByText("恢复本机草稿"),
  );
  expect(screen.getByLabelText("你的作答")).toBeDisabled();
  expect(screen.getByLabelText("你的作答")).toHaveValue(
    "我应断言数据没有变化。",
  );
  expect(screen.getByText("参考答案（由你编写）")).toBeVisible();
});
it.each([1, 10, 60, 180])(
  "balanced mode reserves practice even with overdue cards at budget %s",
  (budget) => {
    const state = { ...emptyTraining(), reviews: [card(1), card(2), card(3)] };
    const progress = { version: 1, updatedAt: null, items: {} };
    const before = structuredClone({ state, progress });
    const plan = recommendTraining(
      state,
      [source],
      roadmap,
      progress,
      "2026-09-10",
      budget,
      "balanced",
    );
    expect(plan[0].id).toBe(roadmap.beginnerPath[0].id);
    expect(plan.length).toBeLessThanOrEqual(3);
    expect(plan.reduce((sum, p) => sum + p.minutes, 0)).toBeLessThanOrEqual(
      budget,
    );
    expect({ state, progress }).toEqual(before);
    expect(
      recommendTraining(
        state,
        [source],
        roadmap,
        progress,
        "2026-09-10",
        budget,
      )[0].id,
    ).toBe(state.reviews[0].id);
  },
);
function entry(
  id: string,
  body: string,
  overrides: Partial<Entry> = {},
): Entry {
  return {
    ...metaSchema.parse({
      id,
      title: "合成学习记录",
      type: "note",
      stageId: "stage-01",
      createdAt: "",
      updatedAt: "",
      deletedAt: null,
      showInPortfolio: true,
    }),
    body,
    path: "",
    sha: "a".repeat(40),
    ...overrides,
  };
}
it("shows matching context past the old prefix and preserves visible-only type filtering", () => {
  const content = "前文".repeat(150) + "这里是 [边界]+ 断言与后文";
  const records = [
    entry("visible", content),
    entry("private", content, { showInPortfolio: false }),
    entry("deleted", content, { deletedAt: "2026-09-10" }),
    entry("assignment", content, { type: "assignment" }),
  ];
  const result = searchIndex(records, roadmap, "[边界]+", false, "note");
  expect(result.map((r) => r.id)).toEqual(["visible"]);
  expect(result[0].body).toContain("[边界]+");
  expect(result[0].body.startsWith("…")).toBe(true);
  expect(searchIndex(records, roadmap, "[边界]+", true, "note")).toHaveLength(
    2,
  );
  expect(searchType("__proto__")).toBe("all");
});
it("highlights literal special characters and renders HTML as text", () => {
  const { container } = render(
    <SearchHighlight text={'<script>alert("x")</script> [.*]'} query="[.*]" />,
  );
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelector("mark")?.textContent).toBe("[.*]");
  expect(searchExcerpt("A".repeat(300) + "needle", "needle")).toContain(
    "needle",
  );
});

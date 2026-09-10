import { it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import roadmap from "@/data/roadmap.json";
import { metaSchema, type Entry } from "@/lib/schemas/content";
import type { Progress, Evidence } from "@/lib/models";
import {
  connectionsForNote,
  connectionsForTasks,
  learningEntriesForViewer,
  publicLearningProgress,
} from "@/lib/content/learning-connections";
import { LearningConnections } from "@/components/notes/learning-connections";
import { BeginnerPath } from "@/components/roadmap/beginner-path";

const topic = roadmap.beginnerPath[0].topicIds[0];
const ciTopic = roadmap.beginnerPath[3].topicIds[0];
function entry(id: string, overrides: Partial<Entry> = {}): Entry {
  return {
    ...metaSchema.parse({
      id,
      type: "note",
      title: id,
      stageId: "stage-02",
      topicIds: [topic],
      showInPortfolio: true,
      createdAt: "2026-09-10T00:00:00Z",
      updatedAt: "2026-09-10T00:00:00Z",
      deletedAt: null,
      ...overrides,
    }),
    body: "Full body must not enter a relation payload",
    path: "content/notes/" + id + ".md",
    sha: "a".repeat(40),
  };
}
function progress(evidence: Evidence[] = [], id = topic): Progress {
  return {
    version: 1,
    updatedAt: null,
    items: {
      [id]: { completed: true, completedAt: "2026-09-10", evidence },
    },
  };
}
afterEach(() => {
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

it("separates declared topics from registered evidence and links to each real stage", () => {
  const source = entry("source", {
    topicIds: [topic, "unknown-topic"],
    stageId: "stage-01",
  });
  const model = connectionsForNote(
    source,
    [source],
    roadmap,
    progress([{ type: "note", id: source.id }], ciTopic),
    false,
  );
  expect(model.topics.map((t) => [t.id, t.declared, t.evidence])).toEqual([
    [topic, true, false],
    [ciTopic, false, true],
  ]);
  expect(model.topics[1].href).toBe("/roadmap?stage=stage-08#" + ciTopic);
  expect(model.tasks.map((t) => t.id)).toEqual(["start", "ci"]);
  expect(model.tasks[1].href).toBe("/roadmap#task-ci");
});

it("does not infer links from tags, titles, unknown IDs, or a stage alone", () => {
  const source = entry("source", {
    topicIds: ["unknown-topic"],
    tags: ["pytest"],
  });
  const other = entry("same-words", {
    title: "pytest",
    stageId: "stage-08",
    topicIds: ["unknown-topic"],
    tags: ["pytest"],
  });
  const model = connectionsForNote(
    source,
    [source, other],
    roadmap,
    progress(),
    false,
  );
  expect(model.topics).toEqual([]);
  expect(model.tasks).toEqual([]);
  expect(model.records).toEqual([]);
  expect(
    connectionsForTasks(roadmap, progress(), [source, other], false).start,
  ).toEqual([]);
});

it("uses labeled same-stage notes only as an empty-match fallback, limited to three", () => {
  const source = entry("source", { topicIds: [] });
  const notes = ["d", "b", "c", "a"].map((id) => entry(id, { topicIds: [] }));
  const model = connectionsForNote(
    source,
    [
      ...notes,
      source,
      entry("daily", { type: "daily" }),
      entry("debug", { type: "debug" }),
    ],
    roadmap,
    progress(),
    false,
  );
  expect(model.fallback).toBe(true);
  expect(model.records.map((r) => r.id)).toEqual(["a", "b", "c"]);
  expect(
    model.records.every((r) => r.reason === "同阶段参考 · 未建立知识点关联"),
  ).toBe(true);
});

it("prefers registered task evidence, deduplicates and truncates after visibility filtering", () => {
  const saved = entry("saved", { topicIds: [], updatedAt: "2020-01-01" });
  const records = [
    entry("hidden", { showInPortfolio: false, updatedAt: "2099-01-01" }),
    entry("z"),
    entry("a"),
    entry("b"),
    saved,
    saved,
  ];
  const model = connectionsForTasks(
    roadmap,
    progress([{ type: "note", id: "saved" }]),
    records,
    false,
  );
  expect(model.start.map((r) => r.id)).toEqual(["saved", "a", "b"]);
  expect(model.start[0].reason).toBe("已登记为本任务的知识点证据");
  expect(model.start[1].reason).toBe("标注了本任务的知识点");
});

it("bounds related notes and records to five, without filling matches with unrelated notes", () => {
  const source = entry("source");
  const records = ["f", "b", "e", "a", "d", "c"].map((id) =>
    entry(id, { type: "debug" }),
  );
  const model = connectionsForNote(
    source,
    [source, ...records, entry("unrelated", { topicIds: [] })],
    roadmap,
    progress(),
    false,
  );
  expect(model.fallback).toBe(false);
  expect(model.records.map((r) => r.id)).toEqual(["a", "b", "c", "d", "e"]);
  expect(model.records[0].href).toBe("/debug-journal/a");
  const single = connectionsForNote(
    source,
    [source, records[0], entry("unrelated", { topicIds: [] })],
    roadmap,
    progress(),
    false,
  );
  expect(single.records).toHaveLength(1);
});

it("matches records through a shared registered topic without falsely declaring topic tags", () => {
  const source = entry("source", { topicIds: [] });
  const record = entry("assignment", { type: "assignment", topicIds: [] });
  const state = progress([
    { type: "note", id: source.id },
    { type: "assignment", id: record.id },
  ]);
  const model = connectionsForNote(
    source,
    [source, record],
    roadmap,
    state,
    false,
  );
  expect(model.records[0].href).toBe("/assignments/assignment");
  expect(model.topics[0]).toMatchObject({ declared: false, evidence: true });
});

it("keeps evidence types distinct when two records share an ID", () => {
  const note = entry("same", { topicIds: [] });
  const debug = entry("same", { type: "debug", topicIds: [] });
  const state = progress([{ type: "debug", id: "same" }]);
  expect(
    connectionsForNote(note, [note, debug], roadmap, state, false).topics,
  ).toEqual([]);
  expect(
    connectionsForTasks(roadmap, state, [note, debug], false).start.map(
      (r) => r.type,
    ),
  ).toEqual(["debug"]);
});

it("shows an explicit shared project only if that project is visible", () => {
  const source = entry("source", { projectId: "project", topicIds: [] });
  const project = entry("project", { type: "project", topicIds: [] });
  const debug = entry("debug", {
    type: "debug",
    topicIds: [],
    projectId: project.id,
  });
  const model = connectionsForNote(
    source,
    [source, project, debug],
    roadmap,
    progress(),
    false,
  );
  expect(model.records.map((r) => r.id).sort()).toEqual(["debug", "project"]);
  expect(model.records.every((r) => r.reason === "同一项目 · project")).toBe(
    true,
  );
  expect(
    connectionsForNote(
      source,
      [source, { ...project, showInPortfolio: false }, debug],
      roadmap,
      progress(),
      false,
    ).records,
  ).toEqual([]);
});

it("never includes deleted records; private records appear only to their owner", () => {
  const source = entry("source");
  const hidden = entry("private-marker", { showInPortfolio: false });
  const deleted = entry("deleted-marker", { deletedAt: "2026-09-10" });
  const entries = [source, hidden, deleted];
  const state = progress([
    { type: "note", id: hidden.id },
    { type: "note", id: deleted.id },
  ]);
  expect(
    connectionsForNote(source, entries, roadmap, state, false).records,
  ).toEqual([]);
  expect(
    connectionsForNote(source, entries, roadmap, state, true).records.map(
      (r) => r.id,
    ),
  ).toEqual([hidden.id]);
  expect(
    connectionsForTasks(roadmap, state, entries, false).start.map((r) => r.id),
  ).toEqual([source.id]);
  expect(learningEntriesForViewer(entries, true).map((e) => e.id)).toEqual([
    source.id,
    hidden.id,
  ]);
});

it("returns no connections for a hidden source viewed anonymously or a deleted source", () => {
  for (const source of [
    entry("hidden", { showInPortfolio: false }),
    entry("deleted", { deletedAt: "2026-09-10" }),
  ]) {
    expect(
      connectionsForNote(source, [entry("other")], roadmap, progress(), false),
    ).toEqual({ topics: [], tasks: [], records: [], fallback: false });
  }
  const deleted = entry("deleted", { deletedAt: "2026-09-10" });
  expect(
    connectionsForNote(deleted, [entry("other")], roadmap, progress(), true)
      .records,
  ).toEqual([]);
});

it("projects anonymous progress without private IDs, leaving completed state and commits intact", () => {
  const entries = [
    entry("public"),
    entry("private", { showInPortfolio: false }),
    entry("deleted", { deletedAt: "2026-09-10" }),
  ];
  const state = progress([
    { type: "note", id: "public" },
    { type: "note", id: "private" },
    { type: "note", id: "deleted" },
    { type: "note", id: "missing" },
    { type: "debug", id: "public" },
    { type: "commit", id: "a".repeat(40) },
  ]);
  const before = structuredClone(state);
  const view = publicLearningProgress(state, entries);
  expect(view.items[topic].evidence).toEqual([
    { type: "note", id: "public" },
    { type: "commit", id: "a".repeat(40) },
  ]);
  expect(view.items[topic].completed).toBe(true);
  expect(state).toEqual(before);
  expect(view.items[topic]).not.toBe(state.items[topic]);
});

it("does not mutate entries, tasks or progress and serializes only minimal link metadata", () => {
  const source = entry("source");
  const entries = [source, entry("second")];
  const state = progress();
  const before = structuredClone({ entries, state, roadmap });
  const model = connectionsForNote(source, entries, roadmap, state, false);
  connectionsForTasks(roadmap, state, entries, false);
  expect({ entries, state, roadmap }).toEqual(before);
  expect(Object.keys(model.records[0]).sort()).toEqual([
    "href",
    "id",
    "reason",
    "title",
    "type",
  ]);
  expect(JSON.stringify(model)).not.toContain(source.body);
  expect(JSON.stringify(model)).not.toContain(source.sha);
});

it("handles an absent beginner path and empty progress without inventing tasks", () => {
  const legacy = { version: 1, stages: roadmap.stages };
  expect(connectionsForTasks(legacy, progress(), [], false)).toEqual({});
  expect(
    connectionsForNote(
      entry("source"),
      [],
      legacy,
      { version: 1, updatedAt: null, items: {} },
      false,
    ).tasks,
  ).toEqual([]);
});

it("renders reasons, honest empty states, and original task/topic links", () => {
  const source = entry("source");
  const model = connectionsForNote(
    source,
    [source, entry("related")],
    roadmap,
    progress(),
    false,
  );
  const view = render(<LearningConnections connections={model} />);
  expect(
    screen.getByRole("link", { name: /环境与 Python 诊断/ }),
  ).toHaveAttribute("href", "/roadmap#task-start");
  expect(screen.getByText(/共同知识点/)).toBeVisible();
  expect(screen.getByText(/不代表已经掌握/)).toBeVisible();
  view.rerender(
    <LearningConnections
      connections={{ topics: [], tasks: [], records: [], fallback: true }}
    />,
  );
  expect(screen.getByRole("heading", { name: "同阶段参考" })).toBeVisible();
  expect(screen.getByText(/暂无可展示的关联记录/)).toBeVisible();
  expect(screen.getByText(/从学习路线选择练习/)).toBeVisible();
  expect(
    screen.queryByText(/已标注的知识点可在下方查阅/),
  ).not.toBeInTheDocument();
});

it("does not leak private/deleted matches through server-rendered relation markup", () => {
  const source = entry("source");
  const model = connectionsForNote(
    source,
    [
      source,
      entry("hidden-canary", { showInPortfolio: false }),
      entry("deleted-canary", { deletedAt: "2026-09-10" }),
    ],
    roadmap,
    progress(),
    false,
  );
  const html = renderToStaticMarkup(
    <LearningConnections connections={model} />,
  );
  expect(html).not.toMatch(/hidden-canary|deleted-canary/);
});

it("opens direct task hashes, reopens the same hash, and keeps all six native chapters", () => {
  const scroll = vi.fn();
  const previous = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  try {
    window.history.replaceState(null, "", "/roadmap#task-ci");
    const { container } = render(
      <BeginnerPath
        roadmap={roadmap}
        progress={{ version: 1, updatedAt: null, items: {} }}
      />,
    );
    const chapter =
      container.querySelector<HTMLDetailsElement>("#task-ci details")!;
    expect(chapter.open).toBe(true);
    expect(container.querySelectorAll("details")).toHaveLength(6);
    chapter.open = false;
    fireEvent.click(screen.getByRole("link", { name: "最小 CI" }));
    expect(chapter.open).toBe(true);
    expect(chapter.querySelector("summary")).toHaveFocus();
    expect(scroll).toHaveBeenCalled();
  } finally {
    HTMLElement.prototype.scrollIntoView = previous;
  }
});

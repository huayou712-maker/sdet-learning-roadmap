import { afterEach, expect, it, vi } from "vitest";
import { parseEntry, serializeEntry } from "@/lib/content/format";
import { assertNoCredentials } from "@/lib/security/credentials";
import { createReadBudget, ReadBudgetError } from "@/lib/security/read-budget";

it("shares a bounded counter between independently constructed readers", () => {
  const shared: number[] = [];
  const limits = [{ count: 2, windowMs: 60000 }];
  const first = createReadBudget(limits, shared);
  const second = createReadBudget(limits, shared);
  first();
  second();
  expect(first).toThrow(ReadBudgetError);
  expect(second).toThrow(ReadBudgetError);
  expect(shared).toHaveLength(2);
});

const meta = {
  id: "format-test",
  type: "note" as const,
  title: "YAML compatibility",
  stageId: "stage-01",
  createdAt: "2026-09-09",
  updatedAt: "2026-09-09",
  deletedAt: null,
};
const parse = (source: string) =>
  parseEntry("content/notes/format.md", source, "a".repeat(40));
afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as Record<string, unknown>).__formatCanary;
});
it.each([
  "js",
  "javascript",
  "JS",
  "JavaScript",
  " js",
  "toString",
  "constructor",
  "__proto__",
])("rejects metadata engine %s without executing code", (engine) => {
  const source =
    "---" +
    engine +
    "\n(globalThis.__formatCanary = 1, " +
    JSON.stringify(meta) +
    ")\n---\nBody";
  expect(() => parse(source)).toThrow();
  expect(
    (globalThis as Record<string, unknown>).__formatCanary,
  ).toBeUndefined();
});
it.each([
  "---js\n(globalThis.__formatCanary = 1, {})\n---\nBody",
  "---\ntitle: This is body text\n---\n\nBody\n",
  "\n\n# Leading blank lines\r\n\r\n---\r\n",
  "~~~js\nconsole.log('educational example')\n~~~",
])("preserves Markdown body byte for byte: %s", (body) => {
  const serialized = serializeEntry(meta, body);
  expect(parse(serialized).body).toBe(body);
  expect(
    (globalThis as Record<string, unknown>).__formatCanary,
  ).toBeUndefined();
});
it.each(["", "yaml", "yml", "json"])(
  "reads legacy data-only frontmatter %s with BOM and CRLF",
  (language) => {
    const header =
      language === "json"
        ? JSON.stringify(meta)
        : serializeEntry(meta, "").split("---\n")[1];
    const source =
      "\uFEFF---" +
      language +
      "\r\n" +
      header.replace(/\n/g, "\r\n") +
      "\r\n---\r\n# Body";
    expect(parse(source)).toMatchObject({ ...meta, body: "# Body" });
  },
);
it.each([
  "title: !!js/function >\n  function () { globalThis.__formatCanary = 1; }",
  "title: !custom foo",
  "title: &recursive [*recursive]",
  "title: &value text\ntags: [*value]",
  "title: one\ntitle: two",
  "title: [unclosed",
])("rejects unsafe YAML without echoing source: %s", (header) => {
  try {
    parse("---\n" + header + "\n---\nBody");
    throw new Error("should reject");
  } catch (error) {
    expect(error).toMatchObject({ status: 503 });
    expect((error as Error).message).not.toContain(header);
  }
  expect(
    (globalThis as Record<string, unknown>).__formatCanary,
  ).toBeUndefined();
});
it("rejects missing delimiters and excessive metadata", () => {
  for (const source of [
    "Body",
    "---\ntitle: no closing delimiter",
    "---\ntitle: " + "A".repeat(65537) + "\n---\nBody",
  ])
    expect(() => parse(source)).toThrow();
});
it.each(["ghp_", "gho_", "ghu_", "ghs_", "ghr_", "github_pat_"])(
  "rejects %s credentials nested in text fields without echoing matches",
  (prefix) => {
    const token = prefix + "A".repeat(40);
    try {
      assertNoCredentials({ checklist: [{ title: token }] });
      throw new Error("should reject");
    } catch (error) {
      expect(error).toMatchObject({ status: 400 });
      expect((error as Error).message).not.toContain(token);
    }
  },
);
it("blocks private keys and allows redacted examples", () => {
  expect(() =>
    assertNoCredentials("-----BEGIN RSA PRIVATE KEY-----"),
  ).toThrow();
  expect(() =>
    assertNoCredentials({
      body: "ghp_<REDACTED> and github_pat_<REDACTED>",
      tags: ["GitHub"],
    }),
  ).not.toThrow();
});
it("enforces sliding request windows and recovers without a reset", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(100000);
  const consume = createReadBudget([
    { count: 2, windowMs: 10000 },
    { count: 3, windowMs: 60000 },
  ]);
  consume();
  consume();
  expect(consume).toThrow(ReadBudgetError);
  vi.setSystemTime(110000);
  consume();
  expect(consume).toThrow(ReadBudgetError);
  vi.setSystemTime(160000);
  expect(consume).not.toThrow();
});

import { it, expect } from "vitest";
import { safePath, writablePath, slug } from "@/lib/github/paths";
import { assertOwner, isOwner } from "@/lib/github/authz";
import { noteInput } from "@/lib/schemas/content";
import { serializeEntry, parseEntry } from "@/lib/content/format";
it("rejects traversal and writes outside the allowed roots", () => {
  for (const p of [
    "../x",
    "content/../x",
    "/content/a",
    "content\\a",
    "content/%2e%2e/a",
    "content//a",
    "C:/x",
    ".env.local",
    "data/roadmap.json",
  ])
    expect(() => writablePath(p)).toThrow();
  expect(safePath("content/notes/stage-01/a.md")).toBeTruthy();
});
it("checks identity on the server, not the display name", () => {
  expect(isOwner(null)).toBe(false);
  expect(() => assertOwner({ login: "huayou12" })).toThrow();
  expect(() => assertOwner({ login: "huayou712-maker" })).not.toThrow();
});
it("validates input and serializes safe front matter", () => {
  expect(
    noteInput.safeParse({ title: "x", stageId: "../", body: "x" }).success,
  ).toBe(false);
  const fields = noteInput.parse({
    title: "Test",
    stageId: "stage-01",
    body: "## code",
    acknowledgedPublic: true,
  });
  const { body, acknowledgedPublic, sha, ...meta } = fields;
  void acknowledgedPublic;
  void sha;
  const text = serializeEntry(
    {
      ...meta,
      id: "test-note",
      type: "note",
      createdAt: "2026-09-08",
      updatedAt: "2026-09-08",
      deletedAt: null,
    },
    body,
  );
  expect(parseEntry("content/notes/a.md", text, "a".repeat(40)).title).toBe(
    "Test",
  );
  expect(slug("../../Hello world")).toBe("hello-world");
});

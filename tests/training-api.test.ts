// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/training/route";
import { trainingRepo } from "./helpers/training-repo";
import type { Repository } from "@/lib/github/types";
const context = vi.hoisted(() => ({
  login: null as string | null,
  repo: null as unknown as Repository,
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  identity: async () => (context.login ? { login: context.login } : null),
}));
vi.mock("@/lib/github/contents", () => ({ repository: () => context.repo }));
beforeEach(() => {
  context.login = "huayou712-maker";
  context.repo = trainingRepo().repo;
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://training.test");
});
afterEach(() => vi.unstubAllEnvs());
function request(origin = "https://training.test", data: unknown = {}) {
  return new Request("https://training.test/api/training", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(data),
  });
}
it.each([null, "other-user"])(
  "denies reads and writes for %s before touching GitHub",
  async (login) => {
    context.login = login;
    expect([401, 403]).toContain((await GET()).status);
    expect([401, 403]).toContain((await POST(request())).status);
    expect(context.repo.getTextFile).not.toHaveBeenCalled();
  },
);
it.each(["", "https://evil.test"])(
  "rejects missing/foreign Origin %s",
  async (origin) => {
    expect((await POST(request(origin))).status).toBe(403);
    expect(context.repo.getTextFile).not.toHaveBeenCalled();
  },
);
it("returns uncached owner state without creating formal records", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(context.repo.createTextFile).not.toHaveBeenCalled();
});
it("rejects invalid payload and oversized input", async () => {
  expect((await POST(request())).status).toBe(400);
  expect(
    (await POST(request("https://training.test", { body: "x".repeat(200001) })))
      .status,
  ).toBe(413);
  expect(context.repo.createTextFile).not.toHaveBeenCalled();
});

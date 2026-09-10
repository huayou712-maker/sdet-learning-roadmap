// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/training/verify/route";
import { consumeVerificationRequest } from "@/lib/training/verification-budget";
import { TRAINING_PATH } from "@/lib/training/schema";
import { trainingRepo } from "./helpers/training-repo";
import {
  practiceAttempt,
  verificationReader,
} from "./helpers/verification-fixture";
import type { Repository } from "@/lib/github/types";
const context = vi.hoisted(() => ({
  login: null as string | null,
  repo: null as unknown as Repository,
  reader: null as unknown,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  identity: async () => (context.login ? { login: context.login } : null),
}));
vi.mock("@/lib/github/contents", () => ({ repository: () => context.repo }));
vi.mock("@/lib/github/training-actions", () => ({
  trainingActions: () => context.reader,
}));
const origin = "https://training.test";
function request(
  body: unknown = { attemptId: practiceAttempt().id },
  headers = { origin, "content-type": "application/json" },
) {
  return new Request(origin + "/api/training/verify", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  context.login = "huayou712-maker";
  context.reader = verificationReader();
  const store = trainingRepo();
  context.repo = store.repo;
  store.put(
    TRAINING_PATH,
    JSON.stringify({ version: 1, attempts: [practiceAttempt()], reviews: [] }),
  );
  (
    globalThis as typeof globalThis & {
      __sdetTrainingVerificationEvents: number[];
    }
  ).__sdetTrainingVerificationEvents.length = 0;
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
it.each([null, "other-user"])(
  "rejects %s before repository or Actions access",
  async (login) => {
    context.login = login;
    const response = await POST(request());
    expect([401, 403]).toContain(response.status);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(context.repo.getTextFile).not.toHaveBeenCalled();
  },
);
it.each(["", "https://foreign.test"])("rejects Origin %s", async (value) => {
  expect(
    (
      await POST(
        request({}, { origin: value, "content-type": "application/json" }),
      )
    ).status,
  ).toBe(403);
  expect(context.repo.getTextFile).not.toHaveBeenCalled();
});
it("rejects arbitrary URL payloads, malformed IDs, content types and overlarge bodies before reading", async () => {
  expect(
    (
      await POST(
        request({ attemptId: practiceAttempt().id, url: "https://evil.test" }),
      )
    ).status,
  ).toBe(400);
  expect((await POST(request({ attemptId: "no" }))).status).toBe(400);
  expect(
    (await POST(request({}, { origin, "content-type": "text/plain" }))).status,
  ).toBe(415);
  expect((await POST(request({ body: "a".repeat(2049) }))).status).toBe(413);
  expect(context.repo.getTextFile).not.toHaveBeenCalled();
});
it("reads only existing attempts, returns private metadata and never changes formal files", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toMatchObject({
    level: "metadata_only",
    reportContentVerified: false,
  });
  expect(
    (await POST(request({ attemptId: "88888888-8888-4888-8888-888888888888" })))
      .status,
  ).toBe(404);
  expect(context.repo.createTextFile).not.toHaveBeenCalled();
  expect(context.repo.updateTextFile).not.toHaveBeenCalled();
  expect(context.repo.deleteFile).not.toHaveBeenCalled();
});
it("limits the fourth request before repository reads and includes retry information", async () => {
  for (let i = 0; i < 3; i++) expect((await POST(request())).status).toBe(200);
  const count = vi.mocked(context.repo.getTextFile).mock.calls.length;
  const response = await POST(request());
  expect(response.status).toBe(429);
  expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
  expect(await response.json()).toEqual({
    error: "CI 核对过于频繁，请稍后手动重试。",
  });
  expect(context.repo.getTextFile).toHaveBeenCalledTimes(count);
});
it("keeps the hourly budget after the minute window resets", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-10T00:00:00Z"));
  for (let batch = 0; batch < 2; batch++) {
    for (let i = 0; i < 3; i++) consumeVerificationRequest();
    vi.advanceTimersByTime(60000);
  }
  consumeVerificationRequest();
  consumeVerificationRequest();
  expect(consumeVerificationRequest).toThrow(/CI 核对/);
  vi.advanceTimersByTime(3600000);
  expect(consumeVerificationRequest).not.toThrow();
});

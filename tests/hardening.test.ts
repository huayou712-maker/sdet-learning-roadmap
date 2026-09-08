import { it, expect, vi, afterEach } from "vitest";
import { validateAsset, MAX_ASSET_BYTES } from "@/lib/content/assets";
import { boundedBody, jsonBody, sameOrigin } from "@/lib/http";
import { cachedRead, clearReads } from "@/lib/github/read-cache";
afterEach(() => {
  clearReads();
  vi.unstubAllEnvs();
});
it("accepts allowed text attachments and rejects executable, mismatched, secret and oversized files", () => {
  expect(
    validateAsset(
      "report.json",
      "application/json",
      Buffer.from('{"passed":true}'),
    ),
  ).toBe("json");
  for (const [name, mime, body] of [
    ["app.exe", "application/octet-stream", "MZ"],
    ["photo.png", "image/png", "not a png"],
    [".env.txt", "text/plain", "secret"],
    ["report.txt", "image/jpeg", "text"],
    ["secret.txt", "text/plain", "x"],
    ["data.json", "application/json", "{"],
  ])
    expect(() => validateAsset(name, mime, Buffer.from(body))).toThrow();
  expect(() =>
    validateAsset(
      "report.txt",
      "text/plain",
      Buffer.from("ghp_" + "x".repeat(36)),
    ),
  ).toThrow("凭据");
  expect(() =>
    validateAsset(
      "report.txt",
      "text/plain",
      Buffer.alloc(MAX_ASSET_BYTES + 1, 65),
    ),
  ).toThrow();
});
it("bounds request bodies and requires a JSON object", async () => {
  await expect(
    boundedBody(
      new Request("http://localhost", { method: "POST", body: "12345" }),
      4,
    ),
  ).rejects.toThrow("内容过大");
  await expect(
    jsonBody(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "null",
      }),
    ),
  ).rejects.toThrow("JSON");
});
it("blocks cross-origin writes", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://learning.example");
  expect(() =>
    sameOrigin(
      new Request("https://learning.example/api/notes", {
        headers: { origin: "https://attacker.example" },
      }),
    ),
  ).toThrow();
  expect(() =>
    sameOrigin(
      new Request("https://learning.example/api/notes", {
        headers: { origin: "https://learning.example" },
      }),
    ),
  ).not.toThrow();
});
it("read cache is transient, shared only until invalidated, and never caches errors", async () => {
  const read = vi.fn().mockResolvedValue("remote");
  expect(await cachedRead("key", read)).toBe("remote");
  await cachedRead("key", read);
  expect(read).toHaveBeenCalledTimes(1);
  clearReads();
  await cachedRead("key", read);
  expect(read).toHaveBeenCalledTimes(2);
  const failing = vi.fn().mockRejectedValue(new Error("offline"));
  await expect(cachedRead("fail", failing)).rejects.toThrow();
  await expect(cachedRead("fail", failing)).rejects.toThrow();
  expect(failing).toHaveBeenCalledTimes(2);
});

import { z } from "zod";
import { assertNoCredentials } from "@/lib/security/credentials";

export const DRAFT_TTL = 7 * 86400000;
export const MAX_DRAFT_BYTES = 100000;
export const draftKey = (scope: string) =>
  "sdet-draft-r7:huayou712-maker/sdet-learning-roadmap:" + scope;
const envelope = z
  .object({
    version: z.literal(1),
    scope: z.string().min(1).max(300),
    revision: z.uuid(),
    savedAt: z.number().int().nonnegative(),
    payload: z.unknown(),
  })
  .strict();
export function encodeDraft<T>(
  scope: string,
  value: T,
  schema: z.ZodType<T>,
  now = Date.now(),
) {
  const payload = schema.parse(value);
  assertNoCredentials(payload);
  const record = envelope.parse({
    version: 1,
    scope,
    revision: crypto.randomUUID(),
    savedAt: now,
    payload,
  });
  const text = JSON.stringify(record);
  if (new TextEncoder().encode(text).length > MAX_DRAFT_BYTES)
    throw new Error("草稿过大，请精简后重试。");
  return { text, revision: record.revision };
}
export function decodeDraft<T>(
  text: string,
  scope: string,
  schema: z.ZodType<T>,
  now = Date.now(),
) {
  if (new TextEncoder().encode(text).length > MAX_DRAFT_BYTES)
    throw new Error("草稿过大，未恢复。");
  const record = envelope.parse(JSON.parse(text));
  if (
    record.scope !== scope ||
    record.savedAt > now + 60000 ||
    now - record.savedAt >= DRAFT_TTL
  )
    throw new Error("草稿已过期或不属于当前表单，未恢复。");
  assertNoCredentials(record.payload);
  return { value: schema.parse(record.payload), revision: record.revision };
}
const result = z.enum(["detected", "missed", "not_run"]);
export const practiceDraftSchema = z
  .object({
    id: z.uuid(),
    commitSha: z.string().max(40),
    normal: z.enum(["passed", "failed", "not_run"]),
    faults: z
      .object({ age: result, duplicate: result, status: result })
      .strict(),
    reflection: z.string().max(2000),
    ciUrl: z.string().max(300),
  })
  .strict();
export const reviewDraftSchema = z
  .object({
    selected: z.string().max(101),
    question: z.string().max(300),
    answer: z.string().max(2000),
    kind: z.enum(["concept", "code"]),
  })
  .strict();
export const responseDraftSchema = z
  .object({
    response: z.string().max(2000),
    evidence: z.string().max(2000),
    revealed: z.boolean(),
  })
  .strict();

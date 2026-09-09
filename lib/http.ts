import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, safeError } from "@/lib/errors";
import { ReadBudgetError } from "@/lib/security/read-budget";
export async function boundedBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new AppError(413, "内容过大");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new AppError(413, "内容过大");
    }
    chunks.push(value);
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError(415, "需要 JSON 内容");
  const text = new TextDecoder().decode(await boundedBody(request, 200000));
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("object required");
    return parsed;
  } catch {
    throw new AppError(400, "JSON 格式错误");
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    : new URL(request.url).origin;
  if (!origin || origin !== expected)
    throw new AppError(403, "请求来源不匹配，请从本站操作");
}
export function errorResponse(error: unknown) {
  const e =
    error instanceof ZodError
      ? {
          status: 400,
          message: "内容格式错误，请检查标题、阶段、标签与必填字段",
        }
      : safeError(error);
  return NextResponse.json(
    { error: e.message },
    {
      status: e.status,
      headers:
        error instanceof ReadBudgetError
          ? {
              "Retry-After": String(error.retryAfter),
              "Cache-Control": "no-store",
            }
          : undefined,
    },
  );
}

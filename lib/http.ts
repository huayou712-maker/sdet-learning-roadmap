import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, safeError } from "@/lib/errors";
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError(415, "需要 JSON 内容");
  const text = await request.text();
  if (Buffer.byteLength(text) > 200000) throw new AppError(413, "内容过大");
  try {
    return JSON.parse(text);
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
  return NextResponse.json({ error: e.message }, { status: e.status });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { identity } from "@/lib/auth/session";
import { assertOwner } from "@/lib/github/authz";
import { repository } from "@/lib/github/contents";
import { trainingActions } from "@/lib/github/training-actions";
import { readTraining } from "@/lib/training/service";
import { verifyAttemptCI } from "@/lib/training/ci-verification";
import { consumeVerificationRequest } from "@/lib/training/verification-budget";
import { boundedBody, errorResponse, sameOrigin } from "@/lib/http";
import { AppError } from "@/lib/errors";
export const dynamic = "force-dynamic";
const input = z.object({ attemptId: z.uuid() }).strict();
export async function POST(request: Request) {
  let response: Response;
  try {
    sameOrigin(request);
    assertOwner(await identity());
    if (!request.headers.get("content-type")?.includes("application/json"))
      throw new AppError(415, "需要 JSON 内容");
    let data: unknown;
    try {
      data = JSON.parse(
        new TextDecoder().decode(await boundedBody(request, 2048)),
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(400, "请求格式错误");
    }
    const { attemptId } = input.parse(data);
    consumeVerificationRequest();
    const snapshot = await readTraining(repository());
    const attempt = snapshot.state.attempts.find((a) => a.id === attemptId);
    if (!attempt)
      throw new AppError(404, "找不到已提交的练习记录，请获取最新版本。");
    response = NextResponse.json(
      await verifyAttemptCI(attempt, trainingActions()),
    );
  } catch (error) {
    response = errorResponse(error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

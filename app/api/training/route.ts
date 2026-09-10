import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { identity } from "@/lib/auth/session";
import { assertOwner } from "@/lib/github/authz";
import { repository } from "@/lib/github/contents";
import { jsonBody, sameOrigin, errorResponse } from "@/lib/http";
import { readTraining, saveTraining } from "@/lib/training/service";
import { entries } from "@/lib/content/service";
export const dynamic = "force-dynamic";
function uncached(response: Response) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export async function GET() {
  try {
    assertOwner(await identity());
    const repo = repository();
    const [snapshot, records] = await Promise.all([
      readTraining(repo),
      entries(repo),
    ]);
    const sources = records
      .filter((r) => r.type === "note" || r.type === "debug")
      .map(({ id, type, title, deletedAt, sha }) => ({
        id,
        type,
        title,
        deletedAt,
        sha,
      }));
    return uncached(
      NextResponse.json({
        ...snapshot,
        sources,
        today: new Date().toISOString().slice(0, 10),
      }),
    );
  } catch (error) {
    return uncached(errorResponse(error));
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    assertOwner(await identity());
    const result = await saveTraining(repository(), await jsonBody(request));
    revalidatePath("/training");
    return uncached(NextResponse.json(result));
  } catch (error) {
    return uncached(errorResponse(error));
  }
}

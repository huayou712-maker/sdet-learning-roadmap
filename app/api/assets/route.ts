import { NextResponse } from "next/server";
import { identity } from "@/lib/auth/session";
import { assertOwner } from "@/lib/github/authz";
import { repository } from "@/lib/github/contents";
import { boundedBody, sameOrigin, errorResponse } from "@/lib/http";
import { uploadAsset, MAX_ASSET_BYTES } from "@/lib/content/assets";
import { AppError } from "@/lib/errors";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    assertOwner(await identity());
    if (!req.headers.get("content-type")?.startsWith("multipart/form-data"))
      throw new AppError(415, "请选择附件");
    const bytes = await boundedBody(req, MAX_ASSET_BYTES + 65536);
    const form = await new Response(bytes, {
      headers: { "Content-Type": req.headers.get("content-type")! },
    }).formData();
    if (form.get("acknowledgedPublic") !== "true")
      throw new AppError(400, "请确认公开仓库提示");
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError(400, "缺少附件");
    return NextResponse.json(
      await uploadAsset(
        repository(),
        file.name,
        file.type,
        Buffer.from(await file.arrayBuffer()),
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}

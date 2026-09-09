import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";
import type { Repository } from "@/lib/github/types";
import { assertNoCredentials } from "@/lib/security/credentials";
export const MAX_ASSET_BYTES = 4 * 1024 * 1024;
const types: Record<string, string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  pdf: ["application/pdf"],
  md: ["text/markdown", "text/plain"],
  txt: ["text/plain"],
  json: ["application/json", "text/plain"],
  yaml: ["application/yaml", "text/yaml", "text/plain"],
  yml: ["application/yaml", "text/yaml", "text/plain"],
  csv: ["text/csv", "text/plain", "application/vnd.ms-excel"],
  jmx: ["application/xml", "text/xml", "text/plain"],
};
export function validateAsset(name: string, mime: string, bytes: Buffer) {
  assertNoCredentials(name);
  if (
    !/^[^\\/:\x00-\x1f]{1,160}$/.test(name) ||
    name.startsWith(".") ||
    /(^|[._-])(env|secret|credentials|id_rsa|token)([._-]|$)/i.test(name)
  )
    throw new AppError(400, "文件名不安全，禁止上传环境配置或凭据");
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (!types[ext])
    throw new AppError(415, "文件类型不允许，禁止可执行文件、SVG 与压缩包");
  if (!bytes.length || bytes.length > MAX_ASSET_BYTES)
    throw new AppError(413, "附件必须非空且不超过 4 MB");
  if (
    !types[ext].includes(mime) &&
    mime !== "" &&
    mime !== "application/octet-stream"
  )
    throw new AppError(415, "扩展名与 MIME 类型不匹配");
  const head = bytes.subarray(0, 16);
  const valid =
    ext === "png"
      ? head
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : ["jpg", "jpeg"].includes(ext)
        ? head[0] === 255 && head[1] === 216 && head[2] === 255
        : ext === "gif"
          ? /^GIF8[79]a/.test(head.toString())
          : ext === "webp"
            ? head.toString("ascii", 0, 4) === "RIFF" &&
              head.toString("ascii", 8, 12) === "WEBP"
            : ext === "pdf"
              ? head.toString("ascii", 0, 5) === "%PDF-"
              : true;
  if (!valid) throw new AppError(415, "文件内容与声明类型不匹配");
  if (!["png", "jpg", "jpeg", "webp", "gif", "pdf"].includes(ext)) {
    const text = bytes.toString("utf8");
    if (bytes.includes(0) || !Buffer.from(text).equals(bytes))
      throw new AppError(415, "文本附件必须为 UTF-8");
    assertNoCredentials(text);
    if (ext === "json") {
      try {
        JSON.parse(text);
      } catch {
        throw new AppError(400, "JSON 附件格式错误");
      }
    }
  }
  return ext;
}
export async function uploadAsset(
  repo: Repository,
  name: string,
  mime: string,
  bytes: Buffer,
) {
  const ext = validateAsset(name, mime, bytes);
  const path =
    "content/assets/" +
    new Date().toISOString().slice(0, 10) +
    "/" +
    randomUUID() +
    "." +
    ext;
  const commit = await repo.createBinaryFile(
    path,
    bytes,
    "assets: add " + ext + " attachment",
  );
  return {
    path,
    commit,
    url:
      "https://raw.githubusercontent.com/huayou712-maker/sdet-learning-roadmap/" +
      commit +
      "/" +
      path,
    image: ["png", "jpg", "jpeg", "webp", "gif"].includes(ext),
  };
}

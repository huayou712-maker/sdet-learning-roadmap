import { AppError } from "@/lib/errors";
export function safePath(path: string) {
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("%") ||
    path.includes(":") ||
    path.split("/").some((p) => !p || p === "." || p === "..") ||
    /[\u0000-\u001f]/.test(path)
  )
    throw new AppError(400, "路径格式错误");
  return path;
}
export function writablePath(path: string) {
  safePath(path);
  if (!(
    path === "data/progress.json" ||
    path.startsWith("content/") ||
    path.startsWith("projects/")
  ))
    throw new AppError(403, "不允许写入此路径");
  return path;
}
export function slug(value: string) {
  return (
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "entry"
  );
}

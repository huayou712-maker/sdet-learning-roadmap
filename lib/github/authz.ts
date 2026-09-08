import { AppError } from "@/lib/errors";
export type Identity = { login: string } | null;
export function isOwner(session: Identity) {
  return (
    !!session &&
    session.login === "huayou712-maker" &&
    session.login === (process.env.ALLOWED_GITHUB_LOGIN || "huayou712-maker")
  );
}
export function assertOwner(session: Identity) {
  if (!session) throw new AppError(401, "登录过期，请先登录 GitHub");
  if (!isOwner(session))
    throw new AppError(403, "权限不足：仅仓库所有者可以修改");
}

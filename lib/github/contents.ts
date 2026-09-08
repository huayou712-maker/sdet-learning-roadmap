import "server-only";
import { githubRepository } from "./client";
import { localRepository } from "./local";
import { testMode } from "@/lib/auth/session";
export function repository() {
  if (testMode()) return localRepository(true);
  return githubRepository();
}
export function sourceLabel() {
  return testMode()
    ? "隔离测试数据"
    : "GitHub · " + (process.env.GITHUB_CONTENT_BRANCH || "main");
}

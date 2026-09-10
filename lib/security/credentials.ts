import { AppError } from "@/lib/errors";

// High-confidence formats only. Never include a match in errors or logs.
const credential =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/;

export function assertNoCredentials(value: unknown): void {
  if (typeof value === "string") {
    if (credential.test(value))
      throw new AppError(
        400,
        "检测到疑似凭据，不能提交到公开仓库。请先脱敏再保存。",
      );
  } else if (Array.isArray(value)) {
    for (const item of value) assertNoCredentials(item);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertNoCredentials(key);
      assertNoCredentials(item);
    }
  }
}

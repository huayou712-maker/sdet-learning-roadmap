export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function safeError(error: unknown) {
  if (error instanceof AppError)
    return { status: error.status, message: error.message };
  return {
    status: 503,
    message: "GitHub API 暂时不可用，请保留或复制当前草稿后重试。",
  };
}

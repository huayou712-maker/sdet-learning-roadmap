import { AppError } from "@/lib/errors";

export const HISTORY_PAGE_SIZE = 30;
export function historyPage(value: string | null): number {
  if (value === null) return 1;
  const page = Number(value);
  if (
    !/^[1-9][0-9]*$/.test(value) ||
    !Number.isSafeInteger(page * HISTORY_PAGE_SIZE)
  )
    throw new AppError(400, "历史页码格式错误");
  return page;
}

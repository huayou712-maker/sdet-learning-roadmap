import "server-only";
import { createReadBudget, ReadBudgetError } from "@/lib/security/read-budget";
const processState = globalThis as typeof globalThis & {
  __sdetTrainingVerificationEvents?: number[];
};
export const verificationLimits = [
  { count: 3, windowMs: 60000 },
  { count: 8, windowMs: 3600000 },
];
const consume = createReadBudget(
  verificationLimits,
  (processState.__sdetTrainingVerificationEvents ??= []),
);
export function consumeVerificationRequest() {
  try {
    consume();
  } catch (error) {
    if (error instanceof ReadBudgetError)
      error.message = "CI 核对过于频繁，请稍后手动重试。";
    throw error;
  }
}

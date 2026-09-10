import { AppError } from "@/lib/errors";

export class ReadBudgetError extends AppError {
  constructor(public retryAfter: number) {
    super(429, "历史查询过于频繁，请稍后重试");
  }
}

// Bounded, ephemeral process memory. No IP headers or business-data persistence.
// Shared by all callers of this instance; distributed deployments also need an edge limit.
export function createReadBudget(
  limits: { count: number; windowMs: number }[],
  events: number[] = [],
) {
  const longest = Math.max(...limits.map((limit) => limit.windowMs));
  return () => {
    const now = Date.now();
    while (events.length && events[0] <= now - longest) events.shift();
    let retryAfter = 0;
    for (const { count, windowMs } of limits) {
      const recent = events.filter((at) => at > now - windowMs);
      if (recent.length >= count)
        retryAfter = Math.max(
          retryAfter,
          Math.ceil((recent[recent.length - count] + windowMs - now) / 1000),
        );
    }
    if (retryAfter) throw new ReadBudgetError(retryAfter);
    events.push(now);
  };
}

// Route bundles and repository instances share counters in the same process.
// Keep plain data here so module reloads cannot retain stale error classes.
const processState = globalThis as typeof globalThis & {
  __sdetHistoryReadEvents?: {
    anonymous: number[];
    authenticated: number[];
    public: number[];
  };
};
const events = (processState.__sdetHistoryReadEvents ??= {
  anonymous: [],
  authenticated: [],
  public: [],
});
export const consumeAnonymousHistoryRequest = createReadBudget(
  [{ count: 60, windowMs: 60000 }],
  events.anonymous,
);
const authenticatedReads = createReadBudget(
  [
    { count: 60, windowMs: 60000 },
    { count: 600, windowMs: 3600000 },
  ],
  events.authenticated,
);
const publicReads = createReadBudget(
  [
    { count: 50, windowMs: 60000 },
    { count: 50, windowMs: 3600000 },
  ],
  events.public,
);
export function consumeHistoryRead() {
  (process.env.GITHUB_WRITE_TOKEN ? authenticatedReads : publicReads)();
}

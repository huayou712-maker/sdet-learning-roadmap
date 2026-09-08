// Ephemeral process memory only. Never a source of truth or filesystem cache.
const reads = new Map<string, { until: number; value: Promise<unknown> }>();
export function clearReads() {
  reads.clear();
}
export async function cachedRead<T>(
  key: string,
  read: () => Promise<T>,
): Promise<T> {
  const hit = reads.get(key);
  if (hit && hit.until > Date.now()) return hit.value as Promise<T>;
  if (reads.size >= 256) reads.clear();
  const value = read().catch((error) => {
    reads.delete(key);
    throw error;
  });
  reads.set(key, { until: Date.now() + 15000, value });
  return value;
}

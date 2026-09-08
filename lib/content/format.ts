import matter from "gray-matter";
import { metaSchema, type Entry } from "@/lib/schemas/content";
import type { z } from "zod";
export function parseEntry(path: string, content: string, sha: string): Entry {
  const parsed = matter(content);
  return { ...metaSchema.parse(parsed.data), path, sha, body: parsed.content };
}
export function serializeEntry(meta: z.input<typeof metaSchema>, body: string) {
  return matter.stringify(body, Object.fromEntries(Object.entries(metaSchema.parse(meta)).filter(([,value])=>value!==undefined)));
}

import matter from "gray-matter";
import {
  metaSchema,
  type Entry,
  type ContentMeta,
} from "@/lib/schemas/content";
export function parseEntry(path: string, content: string, sha: string): Entry {
  const parsed = matter(content);
  return { ...metaSchema.parse(parsed.data), path, sha, body: parsed.content };
}
export function serializeEntry(meta: ContentMeta, body: string) {
  return matter.stringify(body, meta);
}

import { parseDocument, stringify } from "yaml";
import { metaSchema, type Entry } from "@/lib/schemas/content";
import { AppError } from "@/lib/errors";
import { assertNoCredentials } from "@/lib/security/credentials";
import type { z } from "zod";

const MAX_METADATA_LENGTH = 65536;
const invalidMetadata = () =>
  new AppError(
    503,
    "学习记录元数据格式不安全或已损坏，请检查仓库中的 Markdown 文件",
  );

export function parseEntry(path: string, content: string, sha: string): Entry {
  // Only data formats are accepted. Never select an engine from untrusted text.
  const opening = /^\uFEFF?---(yaml|yml|json)?[ \t]*\r?\n/.exec(content);
  if (!opening) throw invalidMetadata();
  const remainder = content.slice(opening[0].length);
  const closing = /^---[ \t]*(?:\r?\n|$)/m.exec(remainder);
  if (!closing || closing.index > MAX_METADATA_LENGTH) throw invalidMetadata();
  const source = remainder.slice(0, closing.index);
  let data: unknown;
  try {
    if (opening[1] === "json") data = JSON.parse(source);
    else {
      const document = parseDocument(source, {
        schema: "core",
        customTags: [],
        prettyErrors: false,
        stringKeys: true,
        uniqueKeys: true,
      });
      if (document.errors.length || document.warnings.length)
        throw invalidMetadata();
      // Metadata never needs aliases; prohibit recursive/expanding alias graphs.
      data = document.toJS({ maxAliasCount: 0 });
    }
    return {
      ...metaSchema.parse(data),
      path,
      sha,
      body: remainder.slice(closing.index + closing[0].length),
    };
  } catch {
    // Do not expose parser source excerpts (which could contain secrets).
    throw invalidMetadata();
  }
}

export function serializeEntry(meta: z.input<typeof metaSchema>, body: string) {
  const data = Object.fromEntries(
    Object.entries(metaSchema.parse(meta)).filter(
      ([, value]) => value !== undefined,
    ),
  );
  assertNoCredentials({ data, body });
  const header = stringify(data, { schema: "core", lineWidth: 0 });
  if (header.length > MAX_METADATA_LENGTH)
    throw new AppError(400, "元数据过长");
  // The body is opaque Markdown, including any leading ---js or YAML examples.
  return "---\n" + header + "---\n" + body;
}

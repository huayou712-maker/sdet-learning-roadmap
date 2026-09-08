import { readFile } from "node:fs/promises";
import { Markdown } from "@/components/ui/markdown";
export default async function Page() {
  return (
    <article className="paper panel document">
      <Markdown body={await readFile("docs/RESOURCES.md", "utf8")} />
    </article>
  );
}

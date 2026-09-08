import { repository } from "@/lib/github/contents";
import { AppError } from "@/lib/errors";
import { Markdown } from "@/components/ui/markdown";
export default async function Page() {
  const file = await repository().getTextFile("docs/RESOURCES.md");
  if (!file) throw new AppError(503, "资源文档尚未提交到目标分支");
  return (
    <article className="paper panel document">
      <Markdown body={file.content} />
    </article>
  );
}

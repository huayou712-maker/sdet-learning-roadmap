import { notFound } from "next/navigation";
import projects from "@/data/projects.json";
import { Markdown } from "@/components/ui/markdown";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = projects.find((p) => p.id === id);
  if (!p) notFound();
  return (
    <article className="paper panel document">
      <Markdown body={p.body} />
    </article>
  );
}

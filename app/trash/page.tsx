import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { readEntries } from "@/lib/content/read";
import { ContentActions } from "@/components/notes/actions";
export default async function Page() {
  if (!isOwner(await identity()))
    return (
      <div className="page-heading">
        <h1>回收站仅所有者可见</h1>
      </div>
    );
  const entries = (await readEntries()).filter((e) => e.deletedAt);
  return (
    <>
      <div className="page-heading">
        <h1>回收站</h1>
        <p>即使永久删除当前文件，Git 历史仍可能保留旧版本。</p>
      </div>
      {entries.map((e) => (
        <section key={e.id}>
          <h2>{e.title}</h2>
          <ContentActions id={e.id} sha={e.sha} trashed />
        </section>
      ))}
      {!entries.length && <p>回收站为空。</p>}
    </>
  );
}

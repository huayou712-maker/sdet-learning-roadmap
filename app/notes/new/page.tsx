import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { readLearning } from "@/lib/content/read";
import { Editor } from "@/components/notes/editor";
export default async function Page() {
  if (!isOwner(await identity()))
    return (
      <div className="page-heading">
        <h1>仅所有者可以编辑</h1>
        <p>请在设置页使用 GitHub 登录。</p>
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <h1>留下一份学习证据</h1>
      </div>
      <Editor roadmap={(await readLearning()).roadmap} />
    </>
  );
}

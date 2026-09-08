import Link from "next/link";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { sourceLabel } from "@/lib/github/contents";
import { SignIn } from "@/components/ui/sign-in";
export default async function Page() {
  const session = await identity();
  const configured = !!(
    process.env.AUTH_SECRET &&
    process.env.AUTH_GITHUB_ID &&
    process.env.AUTH_GITHUB_SECRET
  );
  return (
    <section className="paper panel document">
      <h1>连接与设置</h1>
      <p>
        当前身份：{session?.login || "访客"} ·{" "}
        {isOwner(session) ? "所有者" : "只读访问"}
      </p>
      <p>数据来源：{sourceLabel()}</p>
      <p>OAuth：{configured ? "已配置" : "待配置"}</p>
      <p>
        服务器 GitHub 写权限：
        {process.env.GITHUB_WRITE_TOKEN ? "已配置" : "待配置"}
      </p>
      <SignIn loggedIn={!!session} configured={configured} />
      <hr />
      <p>showInPortfolio 只控制本站展示，不让公开仓库中的文件变为私密。</p>
      {isOwner(session) && (
        <Link className="button" href="/trash">
          打开回收站
        </Link>
      )}
    </section>
  );
}

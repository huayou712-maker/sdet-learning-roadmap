import Link from "next/link";
import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { sourceLabel } from "@/lib/github/contents";
import { SignIn } from "@/components/ui/sign-in";
import { authConfiguration } from "@/lib/auth/configuration";
export default async function Page() {
  const session = await identity();
  const { configured, missing } = authConfiguration();
  return (
    <section className="paper panel document">
      <h1>连接与设置</h1>
      <p>
        当前身份：{session?.login || "访客"} ·{" "}
        {isOwner(session) ? "所有者" : "只读访问"}
      </p>
      <p>数据来源：{sourceLabel()}</p>
      <p>OAuth：{configured ? "已配置" : "待配置"}</p>
      {!configured && (
        <p className="error">
          缺少：{missing.join("、")}
          。请在服务端环境配置后重新部署，不要将密钥填写在学习内容中。
        </p>
      )}
      <p>数据分支：{process.env.GITHUB_CONTENT_BRANCH || "main"}</p>
      <p>
        服务器 GitHub 写权限：
        {process.env.GITHUB_WRITE_TOKEN
          ? "令牌已配置（实际权限以 GitHub 响应为准）"
          : "待配置 GITHUB_WRITE_TOKEN"}
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

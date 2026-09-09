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
    <>
      <header className="page-heading">
        <h1>连接与设置</h1>
        <p>账户、数据来源和公开仓库安全说明。</p>
      </header>
      <div className="workflow settings-workspace">
        <aside className="workflow-nav">
          <nav aria-label="设置分类">
            <a href="#connection">连接</a>
            <a href="#storage">存储</a>
            <a href="#account">账户</a>
            <a href="#security">安全与回收站</a>
          </nav>
        </aside>
        <div>
          <section id="connection">
            <h2>连接</h2>
            <p>OAuth：{configured ? "已配置" : "待配置"}</p>
            {!configured && (
              <p className="error">
                缺少：{missing.join("、")}
                。请在服务端配置后重新部署，不要将密钥填写在学习内容中。
              </p>
            )}
            <p>
              服务器 GitHub 写权限：
              {process.env.GITHUB_WRITE_TOKEN
                ? "令牌已配置（实际权限以 GitHub 响应为准）"
                : "待配置 GITHUB_WRITE_TOKEN"}
            </p>
          </section>
          <section id="storage">
            <h2>GitHub 存储</h2>
            <p>数据来源：{sourceLabel()}</p>
            <p>数据分支：{process.env.GITHUB_CONTENT_BRANCH || "main"}</p>
            <p>
              GitHub Repository
              是唯一正式数据来源。本机只可保留未提交草稿与非关键 UI 偏好。
            </p>
          </section>
          <section id="account">
            <h2>账户</h2>
            <p>
              当前身份：{session?.login || "访客"} ·{" "}
              {isOwner(session) ? "所有者" : "只读访问"}
            </p>
            <SignIn loggedIn={!!session} configured={configured} />
          </section>
          <section id="security">
            <h2>公开仓库与内容删除</h2>
            <p>
              showInPortfolio
              只控制本站展示，不让公开仓库中的文件变为私密。不要上传密码、令牌或个人敏感信息。
            </p>
            {isOwner(session) && (
              <Link className="button secondary" href="/trash">
                打开回收站
              </Link>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
export const navLinks = [
  ["/", "总览"],
  ["/roadmap", "学习路线"],
  ["/notes", "学习笔记"],
  ["/assignments", "作业"],
  ["/projects", "项目"],
  ["/timeline", "时间线"],
  ["/daily", "日课"],
  ["/debug-journal", "排障"],
  ["/portfolio", "作品集"],
  ["/resources", "资源"],
  ["/settings", "设置"],
];
function AccountAvatar({ login }: { login: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="account-avatar" aria-hidden="true">
      <span>{login.slice(0, 1).toUpperCase()}</span>
      {!failed && (
        <Image
          unoptimized
          src={
            "https://github.com/" + encodeURIComponent(login) + ".png?size=64"
          }
          alt=""
          width={30}
          height={30}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
export function Header({
  login,
  owner,
  configured,
}: {
  login: string | null;
  owner: boolean;
  configured: boolean;
}) {
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function auth() {
    setBusy(true);
    setError("");
    try {
      if (login) await signOut({ callbackUrl: "/" });
      else await signIn("github");
    } catch {
      setError("登录服务暂不可用，请到设置页检查连接。");
    } finally {
      setBusy(false);
    }
  }
  const links = navLinks.map(([href, label]) => (
    <Link
      key={href}
      href={href}
      aria-current={
        (href === "/" ? path === "/" : path?.startsWith(href))
          ? "page"
          : undefined
      }
    >
      {label}
    </Link>
  ));
  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="SDET Learning OS 首页">
        <span className="seal">行知</span>
        <span>
          SDET <em>Learning OS</em>
        </span>
      </Link>
      <nav aria-label="主导航" className="desktop-nav">
        {links.slice(0, 6)}
      </nav>
      <div className="header-tools">
        <Link className="header-search" href="/search" aria-label="搜索">
          <Icon name="search" />
        </Link>
        {login ? (
          <details
            className="account-menu"
            onKeyDown={(e) => {
              if (e.key === "Escape") e.currentTarget.open = false;
            }}
          >
            <summary aria-label={"GitHub 账户 " + login}>
              <AccountAvatar login={login} />
              <span className="account-name">{login}</span>
              <span aria-hidden="true">⌄</span>
            </summary>
            <div className="account-dropdown">
              <p>{owner ? "所有者" : "只读访问"}</p>
              <Link href="/settings">设置</Link>
              {owner && <Link href="/trash">回收站</Link>}
              <button onClick={auth} disabled={busy}>
                退出登录
              </button>
            </div>
          </details>
        ) : configured ? (
          <button className="github-login" onClick={auth} disabled={busy}>
            <Icon name="github" />
            {busy ? "连接中…" : "GitHub 登录"}
          </button>
        ) : (
          <Link
            className="button github-login"
            href="/settings"
            aria-label="GitHub 登录（登录未配置）"
          >
            <Icon name="github" />
            登录未配置
          </Link>
        )}
        <details
          className="nav-more"
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.open = false;
          }}
        >
          <summary aria-label="打开页面目录">
            <Icon name="menu" />
          </summary>
          <nav
            aria-label="全部页面"
            onClick={(e) => {
              const details = e.currentTarget.closest("details");
              if (details) details.open = false;
            }}
          >
            {links}
            <Link href="/search">搜索</Link>
          </nav>
        </details>
      </div>
      {error && (
        <p className="header-error" role="alert">
          {error} <Link href="/settings">打开设置</Link>
        </p>
      )}
    </header>
  );
}

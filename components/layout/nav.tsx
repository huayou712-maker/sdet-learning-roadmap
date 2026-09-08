import Link from "next/link";
export const navLinks = [
  ["/", "总览"],
  ["/roadmap", "学习路线"],
  ["/notes", "笔记"],
  ["/assignments", "作业"],
  ["/projects", "项目"],
  ["/daily", "日课"],
  ["/debug-journal", "排障"],
  ["/timeline", "时间线"],
  ["/portfolio", "作品集"],
  ["/resources", "资源"],
  ["/search", "搜索"],
  ["/settings", "设置"],
];
export function Nav() {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="seal">行知</span>
        <span>
          SDET <em>Learning OS</em>
        </span>
      </Link>
      <nav aria-label="主导航" className="desktop-nav">
        {navLinks.slice(0, 5).map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
        <Link href="/portfolio">作品集 ↗</Link>
      </nav>
      <details className="nav-more">
        <summary>目录 ☰</summary>
        <nav aria-label="全部页面">
          {navLinks.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </details>
    </header>
  );
}

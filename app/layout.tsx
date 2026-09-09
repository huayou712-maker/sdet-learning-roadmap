import type { Metadata } from "next";
import { Nav } from "@/components/layout/nav";
import "./globals.css";
import "./jianghu.css";
import "./workflows.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "SDET Learning OS · 行知",
    template: "%s · SDET Learning OS",
  },
  description: "测试开发学习与作品留痕系统",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip" href="#main">
          跳到主要内容
        </a>
        <Nav />
        <main id="main">{children}</main>
        <footer>
          <span>行有所学 · 学有所证</span>
          <span>SDET Learning OS / GitHub 是长期学习档案</span>
        </footer>
      </body>
    </html>
  );
}

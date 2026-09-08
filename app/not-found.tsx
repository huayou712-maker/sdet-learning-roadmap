import Link from "next/link";
export default function NotFound() {
  return (
    <section className="paper panel">
      <h1>这份记录不在这里</h1>
      <p>记录不存在、已移入回收站，或未选择公开展示。</p>
      <Link className="button" href="/">
        返回学习首页
      </Link>
    </section>
  );
}

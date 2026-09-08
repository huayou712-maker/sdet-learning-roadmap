"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="page-heading">
      <h1>学习档案暂时无法读取</h1>
      <p>
        请检查网络、GitHub
        权限与目标分支是否已初始化。未提交的本机草稿不会因此清除。
      </p>
      <button onClick={reset}>重试</button>
    </section>
  );
}

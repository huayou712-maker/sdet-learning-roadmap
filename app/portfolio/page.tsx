import profile from "@/data/profile.json";
export default function Page() {
  return (
    <>
      <section className="portfolio-hero">
        <p className="eyebrow">SELECTED WORK / 测试开发作品集</p>
        <h1>
          把可靠性，
          <br />
          写进每一次实践。
        </h1>
        <p>
          {profile.name} / {profile.bio}
        </p>
        <div className="tags">
          {profile.skills.map((s) => (
            <span className="badge" key={s}>
              {s}
            </span>
          ))}
        </div>
      </section>
      <section className="paper panel">
        <h2>精选项目</h2>
        <p>
          尚无已选择展示的项目。完成实战后，项目、测试报告和排障证据将在这里汇集。
        </p>
      </section>
    </>
  );
}

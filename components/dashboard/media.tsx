import Image from "next/image";
export function Hero() {
  return (
    <div className="hero-visual">
      <Image
        src="/images/jianghu/hero-jianghu.webp"
        alt="夕阳下的荒漠、关隘与远行者"
        fill
        priority
        sizes="(max-width: 1440px) 100vw, 1440px"
        className="hero-image"
      />
      <div className="hero-shade" />
      <div className="hero-grain" />
    </div>
  );
}
export function Thumbnail({
  kind,
  index,
}: {
  kind: "note" | "project";
  index: number;
}) {
  return (
    <div className={"thumbnail " + kind + "-thumbnail"}>
      <Image
        src={
          "/images/jianghu/" +
          kind +
          "-thumb-" +
          String((index % (kind === "note" ? 3 : 4)) + 1).padStart(2, "0") +
          ".webp"
        }
        alt={kind === "note" ? "学习笔记配图" : "项目档案配图"}
        fill
        sizes={
          kind === "note"
            ? "(max-width: 767px) 120px, 100px"
            : "(max-width: 767px) 100vw, (max-width: 1199px) 45vw, 300px"
        }
        loading="lazy"
      />
    </div>
  );
}
export function InkDecoration() {
  return (
    <Image
      src="/images/jianghu/ink-landscape-overlay.png"
      alt=""
      aria-hidden="true"
      fill
      sizes="400px"
      className="ink-decoration"
    />
  );
}

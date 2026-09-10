import Image from "next/image";
import { imageQuality, imageSizes, type ThumbnailSlot } from "./image-sizes";
export function Hero() {
  return (
    <div className="hero-visual">
      <Image
        src="/images/jianghu/hero-jianghu.webp"
        alt="夕阳下的荒漠、关隘与远行者"
        fill
        preload
        quality={imageQuality}
        sizes={imageSizes.hero}
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
  slot,
  eager = false,
}: {
  kind: "note" | "project";
  index: number;
  slot: ThumbnailSlot;
  eager?: boolean;
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
        sizes={imageSizes[slot]}
        quality={imageQuality}
        data-image-slot={slot}
        loading={eager ? "eager" : "lazy"}
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
      sizes={imageSizes.ink}
      quality={imageQuality}
      className="ink-decoration"
    />
  );
}

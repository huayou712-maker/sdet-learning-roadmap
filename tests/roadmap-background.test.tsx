import { it, expect } from "vitest";
import { stat } from "node:fs/promises";
import sharp from "sharp";
import { render } from "@testing-library/react";
import roadmap from "@/data/roadmap.json";
import { RoadmapAtlas } from "@/components/roadmap/roadmap-atlas";

it("retains generated source pixels in the bounded web background without artificial upscaling", async () => {
  const source = await sharp(
    "docs/design/r9/background-imagegen-source.png",
  ).metadata();
  const asset = "public/images/roadmap/roadmap-landscape-r9-v2.webp";
  const web = await sharp(asset).metadata();
  expect(source.width).toBe(1774);
  expect(source.height).toBe(887);
  expect(web.format).toBe("webp");
  expect(web.width).toBe(source.width);
  expect(web.height).toBe(source.height);
  expect((await stat(asset)).size).toBeLessThan(320 * 1024);
});

it("keeps generated art decorative, eagerly loaded and separate from actual links", () => {
  const { container } = render(
    <RoadmapAtlas
      tasks={roadmap.beginnerPath}
      mode="paused"
      reveal={() => {}}
    />,
  );
  const background = container.querySelector("[data-atlas-background]");
  expect(background).toHaveAttribute("alt", "");
  expect(background).toHaveAttribute("aria-hidden", "true");
  expect(background).toHaveAttribute("loading", "eager");
  expect(background).toHaveAttribute("draggable", "false");
  expect(background).toHaveAttribute(
    "sizes",
    expect.stringContaining("1774px"),
  );
  expect(container.querySelectorAll("[data-atlas-task]")).toHaveLength(6);
  expect(container.querySelectorAll("[data-atlas-artwork] path")).toHaveLength(
    1,
  );
});

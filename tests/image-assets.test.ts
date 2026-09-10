import { expect, it } from "vitest";
import { readdir } from "node:fs/promises";
import sharp from "sharp";
import { imageQuality, imageSizes } from "@/components/dashboard/image-sizes";
import config from "../next.config";

it("all supplied display assets retain HD source pixels", async () => {
  const root = "public/images/jianghu";
  const files = (await readdir(root)).filter((file) =>
    /\.(webp|png)$/.test(file),
  );
  expect(files).toHaveLength(9);
  for (const file of files) {
    const image = await sharp(root + "/" + file).metadata();
    expect(image.width, file).toBeGreaterThanOrEqual(1400);
    expect(image.height, file).toBeGreaterThanOrEqual(900);
  }
});

it("large note slots cannot silently inherit the compact row sizes", () => {
  expect(imageSizes.noteEmpty).not.toBe(imageSizes.noteRow);
  expect(imageSizes.noteGrid).not.toBe(imageSizes.noteRow);
  expect(imageSizes.portfolioSingle).not.toBe(imageSizes.projectGrid);
  expect(config.images?.qualities).toContain(imageQuality);
});

/** Upper bounds for the rendered slots in globals/jianghu/workflows.css.
 * Keep these tied to the layout, not to the subject (note vs project).
 * The hero and note rows include the extra source width needed by object-fit: cover.
 */
export const imageQuality = 85;
export const imageSizes = {
  hero: "(max-width: 767px) max(100vw, 516px), 900px",
  ink: "(max-width: 767px) calc(100vw - 32px), (max-width: 1199px) 50vw, 440px",
  noteRow: "(max-width: 767px) 126px, 115px",
  noteEmpty:
    "(max-width: 767px) calc(100vw - 74px), (max-width: 1199px) calc(50vw - 100px), 440px",
  noteGrid:
    "(max-width: 767px) calc(100vw - 32px), (max-width: 1050px) calc(50vw - 146px), 440px",
  projectGrid:
    "(max-width: 767px) calc(100vw - 74px), (max-width: 1050px) calc(50vw - 90px), 400px",
  featuredProject:
    "(max-width: 767px) calc(100vw - 32px), (max-width: 1440px) calc(33.34vw - 36px), 450px",
  portfolioFeature:
    "(max-width: 767px) calc(100vw - 90px), (max-width: 1440px) calc(50vw - 104px), 616px",
  portfolioSingle: "(max-width: 767px) calc(100vw - 74px), 850px",
  portfolioGrid:
    "(max-width: 767px) calc(100vw - 74px), (max-width: 1199px) calc(50vw - 90px), 400px",
} as const;
export type ThumbnailSlot = Exclude<keyof typeof imageSizes, "hero" | "ink">;

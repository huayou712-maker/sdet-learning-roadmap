/** Presentation-only grouping of the existing resource document into roadmap stages. */
const stageForTopic: Record<number, string> = {
  1: "stage-01",
  2: "stage-01",
  3: "stage-01",
  4: "stage-02",
  5: "stage-03",
  6: "stage-03",
  7: "stage-03",
  8: "stage-03",
  9: "stage-04",
  10: "stage-05",
  11: "stage-06",
  12: "stage-07",
  13: "stage-08",
  14: "stage-09",
  15: "stage-10",
  16: "stage-10",
};
export function resourceSections(body: string) {
  return body
    .split(/(?=^# \d+\.)/m)
    .slice(1)
    .map((block) => {
      const [title, ...lines] = block.trim().split(/\r?\n/);
      const number = Number(title.match(/^# (\d+)/)?.[1]);
      const urls = Array.from(
        new Set(block.match(/https:\/\/[^\s)）<>]+/g) || []),
      );
      return {
        title: title.replace(/^# /, ""),
        body: lines.join("\n"),
        stage: stageForTopic[number] || "",
        urls,
        types: Array.from(
          new Set(
            urls.map((url) =>
              url.includes("bilibili.com")
                ? "video"
                : url.includes("github.com")
                  ? "code"
                  : "website",
            ),
          ),
        ),
      };
    });
}

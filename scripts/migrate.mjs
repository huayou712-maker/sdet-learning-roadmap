import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const read = (p) => readFileSync(p, "utf8");
const id = (text) =>
  createHash("sha256").update(text).digest("hex").slice(0, 10);
const stages = [];
const items = {};
let stage;
let group;
for (const line of read("docs/PROGRESS.md").split(/\r?\n/)) {
  const s = line.match(/^## Stage (\d+)：(.+)/);
  if (s) {
    stage = {
      id: "stage-" + s[1].padStart(2, "0"),
      order: Number(s[1]),
      title: s[2],
      description: "",
      groups: [],
    };
    stages.push(stage);
    group = undefined;
    continue;
  }
  if (/^# 求职/.test(line)) {
    stage = undefined;
    continue;
  }
  if (!stage) continue;
  if (line.startsWith("### ")) {
    group = { id: stage.id + "-" + id(line), title: line.slice(4), items: [] };
    stage.groups.push(group);
  }
  const check = line.match(/^- \[([ xX])\] (.+)/);
  if (check) {
    if (!group) {
      group = { id: stage.id + "-core", title: "核心能力", items: [] };
      stage.groups.push(group);
    }
    const itemId = stage.id + "-" + id(group.title + check[2]);
    group.items.push({ id: itemId, title: check[2] });
    items[itemId] = {
      completed: check[1] !== " ",
      completedAt: null,
      evidence: [],
    };
  }
}
const roadmapSource = read("docs/ROADMAP.md");
for (const s of stages) {
  const match = roadmapSource.match(
    new RegExp("(?:^|\\n)#+ Stage " + s.order + "：([^\\n]+)"),
  );
  s.description = match?.[1] ?? s.title;
}
// Initialization only: never infer acceptance semantics from Markdown bullets.
const projects = JSON.parse(
  readFileSync(new URL("../data/projects.json", import.meta.url), "utf8"),
);
const course = JSON.parse(
  readFileSync(new URL("../data/roadmap.json", import.meta.url), "utf8"),
);
mkdirSync("data", { recursive: true });
if (!existsSync("data/roadmap.json"))
  writeFileSync("data/roadmap.json", JSON.stringify(course, null, 2) + "\n");
if (!existsSync("data/progress.json"))
  writeFileSync(
    "data/progress.json",
    JSON.stringify({ version: 1, updatedAt: null, items }, null, 2) + "\n",
  );
if (!existsSync("data/projects.json"))
  writeFileSync("data/projects.json", JSON.stringify(projects, null, 2) + "\n");
if (!existsSync("data/profile.json"))
  writeFileSync(
    "data/profile.json",
    JSON.stringify(
      {
        name: "huayou712-maker",
        bio: "以项目驱动学习，以证据展示测试开发能力。",
        skills: [
          "Python",
          "pytest",
          "Playwright",
          "MySQL",
          "Docker",
          "GitHub Actions",
          "RAG Evaluation",
        ],
      },
      null,
      2,
    ) + "\n",
  );
console.log(
  "Migrated " +
    stages.length +
    " stages, " +
    Object.keys(items).length +
    " items, " +
    projects.length +
    " projects; existing progress preserved.",
);

import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
const runId = randomUUID();
const root = join(process.cwd(), ".e2e-data", runId);
await mkdir(join(root, "data"), { recursive: true });
await mkdir(join(root, "docs"), { recursive: true });
await copyFile("docs/RESOURCES.md", join(root, "docs", "RESOURCES.md"));
for (const name of ["roadmap.json", "projects.json"])
  await copyFile(join("data", name), join(root, "data", name));
const roadmap = JSON.parse(await readFile("data/roadmap.json", "utf8"));
const items = Object.fromEntries(
  roadmap.stages.flatMap((s) =>
    s.groups.flatMap((g) =>
      g.items.map((i) => [
        i.id,
        { completed: false, completedAt: null, evidence: [] },
      ]),
    ),
  ),
);
await writeFile(
  join(root, "data", "progress.json"),
  JSON.stringify({ version: 1, updatedAt: null, items }),
);
await writeFile(
  join(root, "data", "profile.json"),
  JSON.stringify({
    name: "huayou712-maker",
    bio: "隔离测试演示数据",
    skills: ["Python", "pytest", "Playwright", "Docker", "RAG Evaluation"],
  }),
);
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      E2E_ADAPTER: "1",
      E2E_RUN_ID: runId,
      E2E_SECRET: "isolated-local-e2e-only",
      GITHUB_WRITE_TOKEN: "",
      GITHUB_REPO: "",
      AUTH_SECRET: "",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));

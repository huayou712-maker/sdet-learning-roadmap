import Link from "next/link";
import Image from "next/image";
import type { CSSProperties, MouseEvent } from "react";
import type { BeginnerTask } from "@/lib/models";
import {
  setRoadmapMotionDisabled,
  type RoadmapMotionMode,
} from "@/lib/roadmap-motion";
import styles from "./roadmap-atlas.module.css";

const chapterNames: Record<string, string> = {
  start: "环境与 Python",
  design: "测试设计与 HTTP",
  api: "第一组接口测试",
  ci: "最小 CI",
  data: "数据与可靠性",
  ui: "UI 与综合作品",
};
// SVG viewBox coordinates are decoration, never progress or task data.
const positions = [
  [70, 190],
  [240, 140],
  [410, 170],
  [580, 90],
  [750, 125],
  [920, 45],
];

export function RoadmapAtlas({
  tasks,
  nextId,
  mode,
  reveal,
}: {
  tasks: BeginnerTask[];
  nextId?: string;
  mode: RoadmapMotionMode;
  reveal: (id: string) => void;
}) {
  const fixed = ["pending", "static", "reduced"].includes(mode);
  const toggleLabel =
    mode === "reduced"
      ? "路线图已跟随系统减少动态效果"
      : mode === "static"
        ? "当前浏览器使用静态路线图"
        : mode === "running"
          ? "关闭路线动效"
          : "开启路线动效";
  const select = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    // Modified clicks retain the browser's new-tab/window behavior.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    reveal(id);
  };
  return (
    <div
      className={styles.atlas}
      data-roadmap-atlas
      data-layout={tasks.length === 6 ? "panorama" : "list"}
      id="practice-atlas"
    >
      <Image
        src="/images/roadmap/roadmap-landscape-r9-v2.webp"
        alt=""
        aria-hidden="true"
        data-atlas-background
        className={styles.backdrop}
        fill
        sizes="(max-width: 900px) 1774px, (max-width: 1352px) calc(100vw - 72px), 1280px"
        quality={85}
        loading="eager"
        draggable={false}
      />
      <div className={styles.shade} aria-hidden="true" />
      <header className={styles.intro}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>循序实践 · {tasks.length} 站行卷</p>
          <h2 id="beginner-path-heading">先做出第一个可复现的测试</h2>
          <p className={styles.description}>
            按产出推进，每一站都可直接打开。
            <br />
            下方十阶段是参考目录，随用随查。
          </p>
          <Link href="/guide/beginner">入门指南与执行命令 →</Link>
        </div>
        <button
          type="button"
          className={styles.toggle}
          aria-label={toggleLabel}
          aria-pressed={mode === "running"}
          disabled={fixed}
          title={toggleLabel}
          onClick={() => setRoadmapMotionDisabled(mode === "running")}
        >
          <span aria-hidden="true">{mode === "running" ? "Ⅱ" : "▷"}</span>
          {mode === "running" ? "动态·开" : "静态"}
        </button>
      </header>
      <nav className={styles.terrain} aria-label="实践任务导航">
        <svg
          className={styles.artwork}
          viewBox="0 0 1000 280"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
          data-atlas-artwork
        >
          {tasks.length === 6 && (
            <path
              className={styles.trail}
              pathLength="1"
              data-atlas-trail
              d="M70 190C135 193 167 107 240 140S341 208 410 170S524 70 580 90S696 162 750 125S862 18 920 45"
            />
          )}
        </svg>
        <ol className={styles.stops}>
          {tasks.map((task, i) => (
            <li
              key={task.id}
              style={
                tasks.length === 6
                  ? ({
                      "--stop-x": positions[i][0] / 10 + "%",
                      "--stop-y": positions[i][1] / 2.8 + "%",
                    } as CSSProperties)
                  : undefined
              }
            >
              <a
                href={"#task-" + task.id}
                aria-current={task.id === nextId ? "step" : undefined}
                data-atlas-task={task.id}
                onClick={(event) => select(event, task.id)}
              >
                <span className={styles.marker} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={styles.label}>
                  {chapterNames[task.id] ?? task.title}
                  {task.id === nextId && <small>建议从这里继续</small>}
                  <small className={styles.viewing} aria-hidden="true">
                    正在查看
                  </small>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className={styles.legend}>
        <span>点选一站，展开对应章节 ↘</span>
        <span>路径表示学习顺序 · 展开章节不会更改学习进度</span>
      </div>
    </div>
  );
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  getMotionSnapshot,
  getServerMotionSnapshot,
  mountHomeMotion,
  setMotionDisabled,
  subscribeMotion,
  type MotionMode,
} from "@/lib/home-motion";
import styles from "./home-motion.module.css";

const MotionContext = createContext<MotionMode>("pending");

export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const mode = useSyncExternalStore(
    subscribeMotion,
    getMotionSnapshot,
    getServerMotionSnapshot,
  );
  useEffect(() => {
    if (mode !== "running" || !root.current) return;
    return mountHomeMotion(root.current);
  }, [mode]);
  return (
    <MotionContext value={mode}>
      <div
        ref={root}
        className={styles.home}
        data-home-motion
        data-motion={mode}
        data-scene="resting"
      >
        {children}
      </div>
    </MotionContext>
  );
}

export function MotionToggle() {
  const mode = useContext(MotionContext);
  const fixed = mode === "pending" || mode === "reduced" || mode === "static";
  const label =
    mode === "reduced"
      ? "已跟随系统减少动态效果"
      : mode === "static"
        ? "当前浏览器使用静态效果"
        : mode === "running"
          ? "关闭动态效果"
          : "开启动效";
  return (
    <button
      type="button"
      className={styles.toggle}
      disabled={fixed}
      aria-label={label}
      aria-pressed={mode === "running"}
      title={label}
      onClick={() => setMotionDisabled(mode === "running")}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        {mode === "running" ? (
          <path d="M6 4v12M14 4v12" />
        ) : (
          <path d="m7 4 9 6-9 6Z" />
        )}
      </svg>
      <span>{mode === "running" ? "动态·开" : "静态"}</span>
    </button>
  );
}

export function CinematicAtmosphere() {
  const id = useId();
  return (
    <div className={styles.atmosphere} aria-hidden="true" data-atmosphere>
      <div className={styles.light} />
      <div className={styles.mist} />
      <div className={styles.mistFar} />
      <svg
        className={styles.sword}
        viewBox="0 0 1000 560"
        preserveAspectRatio="none"
        focusable="false"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#b58a3b" stopOpacity="0" />
            <stop offset="0.4" stopColor="#fff0d1" />
            <stop offset="1" stopColor="#b58a3b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className={styles.swordHalo}
          d="M-60 500C185 480 388 295 555 262S938 184 1060 36"
          pathLength="1"
          stroke={"url(#" + id + ")"}
        />
        <path
          d="M-60 500C185 480 388 295 555 262S938 184 1060 36"
          pathLength="1"
          stroke={"url(#" + id + ")"}
        />
      </svg>
      <div className={styles.dust}>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            style={
              {
                "--dust-left": 12 + ((i * 19) % 87) + "%",
                "--dust-top": 18 + ((i * 23) % 69) + "%",
                "--dust-delay": -i * 1.7 + "s",
                "--dust-duration": 11 + (i % 4) * 2 + "s",
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

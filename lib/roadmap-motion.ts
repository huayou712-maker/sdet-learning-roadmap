/** Roadmap presentation only; this preference never contains learning data. */
export const roadmapMotionKey = "sdet-ui-roadmap-motion";
const eventName = "sdet-roadmap-motion-change";
let sessionDisabled: boolean | undefined;

export type RoadmapMotionMode =
  "pending" | "running" | "paused" | "reduced" | "static";

export function getRoadmapMotion(): RoadmapMotionMode {
  if (typeof window === "undefined") return "pending";
  if (typeof window.matchMedia !== "function") return "static";
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (media.matches) return "reduced";
  if (
    typeof media.addEventListener !== "function" ||
    typeof window.IntersectionObserver !== "function"
  )
    return "static";
  let disabled = sessionDisabled ?? false;
  if (sessionDisabled === undefined) {
    try {
      disabled = localStorage.getItem(roadmapMotionKey) === "off";
    } catch {
      /* A blocked store leaves the on-page switch usable in memory. */
    }
  }
  return disabled ? "paused" : "running";
}
export function getServerRoadmapMotion(): RoadmapMotionMode {
  return "pending";
}

export function setRoadmapMotionDisabled(disabled: boolean) {
  sessionDisabled = disabled;
  try {
    localStorage.setItem(roadmapMotionKey, disabled ? "off" : "on");
  } catch {
    /* The session choice still works with denied or full storage. */
  }
  window.dispatchEvent(new Event(eventName));
}

export function subscribeRoadmapMotion(changed: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (typeof media.addEventListener !== "function") return () => {};
  const storage = (event: StorageEvent) => {
    if (event.key === roadmapMotionKey || event.key === null) {
      sessionDisabled = undefined;
      changed();
    }
  };
  media.addEventListener("change", changed);
  window.addEventListener(eventName, changed);
  window.addEventListener("storage", storage);
  return () => {
    media.removeEventListener("change", changed);
    window.removeEventListener(eventName, changed);
    window.removeEventListener("storage", storage);
  };
}

/** Finite CSS animation: observation and visibility only, no rendering loop. */
export function mountRoadmapMotion(root: HTMLElement) {
  const atlas = root.querySelector("[data-roadmap-atlas]");
  if (
    !atlas?.querySelector("[data-atlas-trail]") ||
    typeof IntersectionObserver !== "function"
  )
    return () => {};
  let inView = false;
  let disposed = false;
  const sync = () => {
    if (disposed) return;
    const active = inView && document.visibilityState !== "hidden";
    root.dataset.atlasScene = active ? "active" : "resting";
    if (active && !root.dataset.atlasEntered) {
      root.dataset.atlasEntered = "true";
      root.dataset.atlasAnimate = "true";
    }
  };
  const observer = new IntersectionObserver(
    (entries) => {
      if (disposed) return;
      for (const entry of entries) {
        if (entry.target !== atlas) continue;
        inView = entry.isIntersecting;
        sync();
      }
    },
    { threshold: 0.08 },
  );
  const finish = (event: Event) => {
    if (
      event.target instanceof Element &&
      event.target.hasAttribute("data-atlas-trail")
    )
      delete root.dataset.atlasAnimate;
  };
  observer.observe(atlas);
  root.addEventListener("animationend", finish);
  document.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    disposed = true;
    observer.disconnect();
    root.removeEventListener("animationend", finish);
    document.removeEventListener("visibilitychange", sync);
    delete root.dataset.atlasAnimate;
    root.dataset.atlasScene = "resting";
  };
}

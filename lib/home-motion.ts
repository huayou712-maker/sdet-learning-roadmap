/** Presentation only. No learning records, credentials or network requests. */
export const motionPreferenceKey = "sdet-ui-home-motion";
const preferenceEvent = "sdet-home-motion-change";
let sessionChoice: boolean | undefined;

export type MotionMode =
  "pending" | "running" | "paused" | "reduced" | "static";

export function getMotionSnapshot(): MotionMode {
  if (typeof window === "undefined") return "pending";
  if (typeof window.matchMedia !== "function") return "static";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return "reduced";
  if (typeof window.IntersectionObserver !== "function") return "static";
  let disabled = sessionChoice ?? false;
  if (sessionChoice === undefined) {
    try {
      disabled = window.localStorage.getItem(motionPreferenceKey) === "off";
    } catch {
      // A blocked store must not block a static or interactive home page.
    }
  }
  return disabled ? "paused" : "running";
}

export function getServerMotionSnapshot(): MotionMode {
  return "pending";
}

export function setMotionDisabled(disabled: boolean) {
  sessionChoice = disabled;
  try {
    window.localStorage.setItem(motionPreferenceKey, disabled ? "off" : "on");
  } catch {
    // The in-memory choice still works when storage is blocked or full.
  }
  window.dispatchEvent(new Event(preferenceEvent));
}

export function subscribeMotion(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onStorage = (event: StorageEvent) => {
    if (event.key === motionPreferenceKey || event.key === null) {
      sessionChoice = undefined;
      onChange();
    }
  };
  reduced.addEventListener("change", onChange);
  window.addEventListener(preferenceEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    reduced.removeEventListener("change", onChange);
    window.removeEventListener(preferenceEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function sceneOffset(x: number, y: number, rect: DOMRect) {
  const axis = (value: number, start: number, size: number, limit: number) =>
    size > 0 && Number.isFinite(value)
      ? Math.max(-1, Math.min(1, ((value - start) / size - 0.5) * 2)) * limit
      : 0;
  return {
    x: axis(x, rect.left, rect.width, 18),
    y: axis(y, rect.top, rect.height, 10),
  };
}

/** One observer, event-driven frames only, and complete cleanup on navigation. */
export function mountHomeMotion(root: HTMLElement) {
  const hero = root.querySelector<HTMLElement>("[data-cinematic-hero]");
  if (!hero || typeof IntersectionObserver !== "function") return () => {};
  const fine = window.matchMedia(
    "(min-width: 768px) and (hover: hover) and (pointer: fine)",
  );
  let inView = false;
  let listening = false;
  let disposed = false;
  let frame: number | undefined;
  let pointer = { x: 0, y: 0 };

  const resetPointer = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    hero.style.removeProperty("--scene-x");
    hero.style.removeProperty("--scene-y");
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    pointer = { x: event.clientX, y: event.clientY };
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      if (disposed || !listening) return;
      const offset = sceneOffset(
        pointer.x,
        pointer.y,
        hero.getBoundingClientRect(),
      );
      hero.style.setProperty("--scene-x", offset.x.toFixed(2) + "px");
      hero.style.setProperty("--scene-y", offset.y.toFixed(2) + "px");
    });
  };
  const stopPointer = () => {
    hero.removeEventListener("pointermove", onPointerMove);
    hero.removeEventListener("pointerleave", resetPointer);
    listening = false;
    resetPointer();
  };
  const syncScene = () => {
    if (disposed) return;
    const visible = document.visibilityState !== "hidden";
    const active = inView && visible;
    root.dataset.scene = active ? "active" : "resting";
    root.dataset.document = visible ? "visible" : "hidden";
    if (active && fine.matches) {
      if (!listening) {
        hero.addEventListener("pointermove", onPointerMove, { passive: true });
        hero.addEventListener("pointerleave", resetPointer);
        listening = true;
      }
    } else stopPointer();
  };
  const observer = new IntersectionObserver(
    (entries) => {
      if (disposed) return;
      for (const entry of entries) {
        if (entry.target === hero) {
          inView = entry.isIntersecting;
          syncScene();
        } else if (entry.isIntersecting) {
          const section = entry.target as HTMLElement;
          section.dataset.entered = "true";
          if (!section.contains(document.activeElement))
            section.dataset.revealing = "true";
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.08 },
  );
  observer.observe(hero);
  root
    .querySelectorAll<HTMLElement>("[data-motion-reveal]")
    .forEach((section) => {
      if (!section.dataset.entered) observer.observe(section);
    });
  const finishReveal = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const section = target.closest<HTMLElement>("[data-motion-reveal]");
    if (section && root.contains(section)) delete section.dataset.revealing;
  };
  root.addEventListener("animationend", finishReveal);
  root.addEventListener("focusin", finishReveal);
  document.addEventListener("visibilitychange", syncScene);
  fine.addEventListener("change", syncScene);
  syncScene();
  return () => {
    disposed = true;
    observer.disconnect();
    root.removeEventListener("animationend", finishReveal);
    root.removeEventListener("focusin", finishReveal);
    root
      .querySelectorAll<HTMLElement>("[data-revealing]")
      .forEach((section) => delete section.dataset.revealing);
    document.removeEventListener("visibilitychange", syncScene);
    fine.removeEventListener("change", syncScene);
    stopPointer();
    root.dataset.scene = "resting";
  };
}

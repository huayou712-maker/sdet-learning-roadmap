import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HomeMotion,
  MotionToggle,
  CinematicAtmosphere,
} from "@/components/dashboard/home-motion";
import {
  getMotionSnapshot,
  getServerMotionSnapshot,
  motionPreferenceKey,
  mountHomeMotion,
  sceneOffset,
  setMotionDisabled,
  subscribeMotion,
} from "@/lib/home-motion";

class Media extends EventTarget {
  matches = false;
  change(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(new Event("change"));
  }
}
class Observer {
  static instances: Observer[] = [];
  targets = new Set<Element>();
  observe = vi.fn((target: Element) => this.targets.add(target));
  unobserve = vi.fn((target: Element) => this.targets.delete(target));
  disconnect = vi.fn(() => this.targets.clear());
  constructor(private callback: IntersectionObserverCallback) {
    Observer.instances.push(this);
  }
  emit(target: Element, isIntersecting = true) {
    this.callback(
      [{ target, isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}
let reduced: Media;
let fine: Media;
let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  reduced = new Media();
  fine = new Media();
  fine.matches = true;
  frames = new Map();
  let nextFrame = 0;
  Observer.instances = [];
  vi.stubGlobal("matchMedia", (query: string) =>
    query.includes("reduced-motion") ? reduced : fine,
  );
  vi.stubGlobal("IntersectionObserver", Observer);
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((fn: FrameRequestCallback) => {
      const id = ++nextFrame;
      frames.set(id, fn);
      return id;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id: number) => frames.delete(id)),
  );
  localStorage.clear();
  // Reset module-local fallback as a real cross-tab event would.
  const stop = subscribeMotion(() => {});
  window.dispatchEvent(
    new StorageEvent("storage", { key: motionPreferenceKey }),
  );
  stop();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("starts with static SSR and gives the system preference priority", () => {
  expect(getServerMotionSnapshot()).toBe("pending");
  expect(getMotionSnapshot()).toBe("running");
  setMotionDisabled(true);
  expect(localStorage.getItem(motionPreferenceKey)).toBe("off");
  expect(getMotionSnapshot()).toBe("paused");
  reduced.matches = true;
  setMotionDisabled(false);
  expect(getMotionSnapshot()).toBe("reduced");
});

it("accepts only the explicit off preference and handles cross-tab changes", () => {
  const changed = vi.fn();
  const stop = subscribeMotion(changed);
  localStorage.setItem(motionPreferenceKey, '{"completed":true}');
  expect(getMotionSnapshot()).toBe("running");
  setMotionDisabled(true);
  localStorage.setItem(motionPreferenceKey, "on");
  window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
  expect(getMotionSnapshot()).toBe("paused");
  window.dispatchEvent(
    new StorageEvent("storage", { key: motionPreferenceKey }),
  );
  expect(getMotionSnapshot()).toBe("running");
  expect(changed).toHaveBeenCalledTimes(2);
  stop();
  reduced.change(true);
  expect(changed).toHaveBeenCalledTimes(2);
});

it("the switch still works when localStorage read and write throw", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  expect(getMotionSnapshot()).toBe("running");
  setMotionDisabled(true);
  expect(getMotionSnapshot()).toBe("paused");
  setMotionDisabled(false);
  expect(getMotionSnapshot()).toBe("running");
});

it("unsupported observation or media APIs leave a usable static mode", () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  expect(getMotionSnapshot()).toBe("static");
  vi.stubGlobal("matchMedia", undefined);
  expect(getMotionSnapshot()).toBe("static");
  expect(() => subscribeMotion(() => {})()).not.toThrow();
});

it("pointer offsets are bounded and invalid geometry cannot produce NaN", () => {
  const rect = new DOMRect(10, 20, 100, 200);
  expect(sceneOffset(60, 120, rect)).toEqual({ x: 0, y: 0 });
  expect(sceneOffset(-500, 900, rect)).toEqual({ x: -18, y: 10 });
  expect(sceneOffset(Infinity, NaN, rect)).toEqual({ x: 0, y: 0 });
  expect(sceneOffset(9, 9, new DOMRect())).toEqual({ x: 0, y: 0 });
});

function fixture() {
  const root = document.createElement("div");
  root.innerHTML =
    "<section data-cinematic-hero></section><section data-motion-reveal>Always visible</section>";
  document.body.append(root);
  const hero = root.firstElementChild as HTMLElement;
  vi.spyOn(hero, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 100, 100),
  );
  return { root, hero, section: root.lastElementChild as HTMLElement };
}
function move(hero: HTMLElement, pointerType = "mouse") {
  const event = new MouseEvent("pointermove", { clientX: 100, clientY: 100 });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  hero.dispatchEvent(event);
}
function flushFrame() {
  for (const [id, callback] of frames) {
    frames.delete(id);
    callback(100);
  }
}

it("coalesces pointer work and stops it offscreen, on coarse pointers and at teardown", () => {
  const { root, hero, section } = fixture();
  const stop = mountHomeMotion(root);
  const observer = Observer.instances[0];
  expect(root.dataset.scene).toBe("resting");
  move(hero);
  expect(frames.size).toBe(0);
  observer.emit(hero);
  expect(root.dataset.scene).toBe("active");
  move(hero);
  move(hero);
  move(hero);
  expect(frames.size).toBe(1);
  flushFrame();
  expect(hero.style.getPropertyValue("--scene-x")).toBe("18.00px");
  expect(frames.size).toBe(0); // No perpetual JS render loop.
  observer.emit(section);
  expect(section.dataset.entered).toBe("true");
  expect(observer.targets.has(section)).toBe(false);
  move(hero);
  observer.emit(hero, false);
  expect(frames.size).toBe(0);
  expect(hero.style.length).toBe(0);
  observer.emit(hero);
  fine.change(false);
  move(hero);
  expect(frames.size).toBe(0);
  fine.change(true);
  move(hero, "touch");
  expect(frames.size).toBe(0);
  move(hero);
  expect(frames.size).toBe(1);
  stop();
  expect(frames.size).toBe(0);
  expect(observer.disconnect).toHaveBeenCalledOnce();
  observer.emit(hero);
  move(hero);
  expect(root.dataset.scene).toBe("resting");
  expect(frames.size).toBe(0);
  root.remove();
});

it("visibility changes pause the scene and cancel pending pointer frames", () => {
  let visible = true;
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() =>
    visible ? "visible" : "hidden",
  );
  const { root, hero } = fixture();
  const stop = mountHomeMotion(root);
  Observer.instances[0].emit(hero);
  move(hero);
  visible = false;
  document.dispatchEvent(new Event("visibilitychange"));
  expect(root.dataset.scene).toBe("resting");
  expect(root.dataset.document).toBe("hidden");
  expect(frames.size).toBe(0);
  visible = true;
  document.dispatchEvent(new Event("visibilitychange"));
  expect(root.dataset.scene).toBe("active");
  stop();
  root.remove();
});

it("server-rendered children stay present and the accessible control reacts live", () => {
  const { container, unmount } = render(
    <HomeMotion>
      <section data-cinematic-hero>
        <Link href="/roadmap">学习入口</Link>
        <MotionToggle />
        <CinematicAtmosphere />
      </section>
    </HomeMotion>,
  );
  expect(screen.getByRole("link", { name: "学习入口" })).toHaveAttribute(
    "href",
    "/roadmap",
  );
  expect(container.querySelector("[data-atmosphere]")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  expect(
    container.querySelector("[data-atmosphere]")!.querySelectorAll("span"),
  ).toHaveLength(10);
  fireEvent.click(screen.getByRole("button", { name: "关闭动态效果" }));
  expect(container.querySelector("[data-home-motion]")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  expect(Observer.instances[0].disconnect).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "开启动效" }));
  act(() => reduced.change(true));
  expect(
    screen.getByRole("button", { name: "已跟随系统减少动态效果" }),
  ).toBeDisabled();
  expect(container.querySelector("[data-home-motion]")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  unmount();
  expect(
    Observer.instances.every((o) => o.disconnect.mock.calls.length === 1),
  ).toBe(true);
});

it("server markup is complete without reading a browser preference or hiding content", () => {
  const html = renderToStaticMarkup(
    <HomeMotion>
      <section data-cinematic-hero>
        <p>以代码为剑</p>
        <MotionToggle />
      </section>
      <section data-motion-reveal>学习记录</section>
    </HomeMotion>,
  );
  expect(html).toContain('data-motion="pending"');
  expect(html).toContain("以代码为剑");
  expect(html).toContain("学习记录");
  expect(html).not.toContain('data-revealing="true"');
});

it("finishes reveal on animation end or focus and does not re-arm visited content", () => {
  const { root, section } = fixture();
  const stop = mountHomeMotion(root);
  Observer.instances[0].emit(section);
  expect(section.dataset.revealing).toBe("true");
  section.dispatchEvent(new Event("animationend", { bubbles: true }));
  expect(section.dataset.revealing).toBeUndefined();
  expect(section.dataset.entered).toBe("true");
  stop();
  const stopAgain = mountHomeMotion(root);
  expect(Observer.instances[1].targets.has(section)).toBe(false);
  section.dataset.revealing = "true";
  section.dispatchEvent(new Event("focusin", { bubbles: true }));
  expect(section.dataset.revealing).toBeUndefined();
  stopAgain();
  root.remove();
});

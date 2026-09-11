import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import roadmap from "@/data/roadmap.json";
import { BeginnerPath } from "@/components/roadmap/beginner-path";
import { RoadmapAtlas } from "@/components/roadmap/roadmap-atlas";
import {
  getRoadmapMotion,
  getServerRoadmapMotion,
  mountRoadmapMotion,
  roadmapMotionKey,
  setRoadmapMotionDisabled,
  subscribeRoadmapMotion,
} from "@/lib/roadmap-motion";

class Media extends EventTarget {
  matches = false;
  change(value: boolean) {
    this.matches = value;
    this.dispatchEvent(new Event("change"));
  }
}
class Observer {
  static instances: Observer[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(private callback: IntersectionObserverCallback) {
    Observer.instances.push(this);
  }
  emit(target: Element, isIntersecting: boolean) {
    this.callback(
      [{ target, isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}
let media: Media;
const scrollDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);
beforeEach(() => {
  media = new Media();
  Observer.instances = [];
  vi.stubGlobal("matchMedia", () => media);
  vi.stubGlobal("IntersectionObserver", Observer);
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  history.replaceState(null, "", "/roadmap");
  localStorage.clear();
  const stop = subscribeRoadmapMotion(() => {});
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
  stop();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (scrollDescriptor)
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollIntoView",
      scrollDescriptor,
    );
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});
const progress = { version: 1, updatedAt: null, items: {} };

it("renders all real links and native chapters in static SSR without a store write", () => {
  const writes = vi.spyOn(Storage.prototype, "setItem");
  expect(getServerRoadmapMotion()).toBe("pending");
  const html = renderToStaticMarkup(
    <BeginnerPath roadmap={roadmap} progress={progress} />,
  );
  expect(html).toContain('data-roadmap-motion="pending"');
  expect(html.match(/<details/g)).toHaveLength(6);
  for (const task of roadmap.beginnerPath)
    expect(html).toContain('href="#task-' + task.id + '"');
  expect(writes).not.toHaveBeenCalled();
  expect(html).not.toContain("data-viewing");
});

it("initial reads do not persist and only the explicit off value disables motion", () => {
  const writes = vi.spyOn(Storage.prototype, "setItem");
  expect(getRoadmapMotion()).toBe("running");
  expect(writes).not.toHaveBeenCalled();
  localStorage.setItem(roadmapMotionKey, '{"completed":true}');
  expect(getRoadmapMotion()).toBe("running");
  localStorage.setItem(roadmapMotionKey, "off");
  expect(getRoadmapMotion()).toBe("paused");
});

it("cross-tab preference updates are scoped and all preference listeners detach", () => {
  const changed = vi.fn();
  const stop = subscribeRoadmapMotion(changed);
  setRoadmapMotionDisabled(true);
  localStorage.setItem(roadmapMotionKey, "on");
  window.dispatchEvent(
    new StorageEvent("storage", { key: "sdet-ui-home-motion" }),
  );
  expect(getRoadmapMotion()).toBe("paused");
  window.dispatchEvent(new StorageEvent("storage", { key: roadmapMotionKey }));
  expect(getRoadmapMotion()).toBe("running");
  expect(changed).toHaveBeenCalledTimes(2);
  stop();
  media.change(true);
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
  expect(changed).toHaveBeenCalledTimes(2);
});

it("the on-page switch works with denied storage and changes no learning data", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("denied");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("full");
  });
  const before = structuredClone(progress);
  render(<BeginnerPath roadmap={roadmap} progress={progress} />);
  fireEvent.click(screen.getByRole("button", { name: "关闭路线动效" }));
  expect(getRoadmapMotion()).toBe("paused");
  fireEvent.click(screen.getByRole("button", { name: "开启路线动效" }));
  expect(getRoadmapMotion()).toBe("running");
  expect(progress).toEqual(before);
});

it("system reduced motion takes precedence, including live preference changes", () => {
  render(<BeginnerPath roadmap={roadmap} progress={progress} />);
  act(() => media.change(true));
  expect(
    screen.getByRole("button", { name: "路线图已跟随系统减少动态效果" }),
  ).toBeDisabled();
  act(() => setRoadmapMotionDisabled(false));
  expect(getRoadmapMotion()).toBe("reduced");
  act(() => media.change(false));
  expect(screen.getByRole("button", { name: "关闭路线动效" })).toBeEnabled();
});

it("missing observation and media listeners produce a usable static mode", () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  expect(getRoadmapMotion()).toBe("static");
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  expect(getRoadmapMotion()).toBe("static");
  expect(() => subscribeRoadmapMotion(() => {})()).not.toThrow();
  vi.stubGlobal("matchMedia", undefined);
  expect(getRoadmapMotion()).toBe("static");
  render(<BeginnerPath roadmap={roadmap} progress={progress} />);
  expect(
    screen.getByRole("button", { name: "当前浏览器使用静态路线图" }),
  ).toBeDisabled();
  expect(
    within(
      screen.getByRole("navigation", { name: "实践任务导航" }),
    ).getAllByRole("link"),
  ).toHaveLength(6);
});

function fixture() {
  const root = document.createElement("div");
  root.innerHTML =
    "<div data-roadmap-atlas><svg><path data-atlas-trail></path></svg></div>";
  return {
    root,
    atlas: root.firstElementChild!,
    trail: root.querySelector("path")!,
  };
}
it("starts once in view and pauses while offscreen or the document is hidden", () => {
  const { root, atlas } = fixture();
  const visibility = vi
    .spyOn(document, "visibilityState", "get")
    .mockReturnValue("visible");
  const stop = mountRoadmapMotion(root);
  const observer = Observer.instances[0];
  expect(root.dataset.atlasAnimate).toBeUndefined();
  observer.emit(atlas, true);
  expect(root.dataset.atlasScene).toBe("active");
  expect(root.dataset.atlasAnimate).toBe("true");
  observer.emit(atlas, false);
  expect(root.dataset.atlasScene).toBe("resting");
  observer.emit(atlas, true);
  visibility.mockReturnValue("hidden");
  document.dispatchEvent(new Event("visibilitychange"));
  expect(root.dataset.atlasScene).toBe("resting");
  visibility.mockReturnValue("visible");
  document.dispatchEvent(new Event("visibilitychange"));
  expect(root.dataset.atlasScene).toBe("active");
  stop();
});

it("ends its finite reveal, never replays on scroll, and ignores disposed callbacks", () => {
  const { root, atlas, trail } = fixture();
  const stop = mountRoadmapMotion(root);
  const observer = Observer.instances[0];
  observer.emit(atlas, true);
  atlas.dispatchEvent(new Event("animationend", { bubbles: true }));
  expect(root.dataset.atlasAnimate).toBe("true");
  trail.dispatchEvent(new Event("animationend", { bubbles: true }));
  expect(root.dataset.atlasAnimate).toBeUndefined();
  observer.emit(atlas, false);
  observer.emit(atlas, true);
  expect(root.dataset.atlasAnimate).toBeUndefined();
  stop();
  expect(observer.disconnect).toHaveBeenCalledOnce();
  observer.emit(atlas, true);
  document.dispatchEvent(new Event("visibilitychange"));
  expect(root.dataset.atlasScene).toBe("resting");
  const stopAgain = mountRoadmapMotion(root);
  Observer.instances[1].emit(atlas, true);
  expect(root.dataset.atlasAnimate).toBeUndefined();
  stopAgain();
});

it("cleanup cancels a pending reveal and does not require a rendering API", () => {
  vi.stubGlobal("requestAnimationFrame", undefined);
  const { root, atlas } = fixture();
  const stop = mountRoadmapMotion(root);
  Observer.instances[0].emit(atlas, true);
  stop();
  expect(root.dataset.atlasAnimate).toBeUndefined();
  expect(() =>
    mountRoadmapMotion(document.createElement("div"))(),
  ).not.toThrow();
});

it("opening a chapter marks viewing independently of the recommended task", () => {
  const before = structuredClone(progress);
  const { container } = render(
    <BeginnerPath roadmap={roadmap} progress={progress} />,
  );
  fireEvent.click(container.querySelector('[data-atlas-task="ci"]')!);
  expect(container.querySelector("#task-ci details")).toHaveAttribute("open");
  expect(container.querySelector("#task-ci summary")).toHaveFocus();
  expect(container.querySelector('[data-atlas-task="ci"]')).toHaveAttribute(
    "data-viewing",
    "true",
  );
  expect(container.querySelector('[data-atlas-task="ci"]')).not.toHaveAttribute(
    "aria-current",
  );
  expect(container.querySelector('[data-atlas-task="start"]')).toHaveAttribute(
    "aria-current",
    "step",
  );
  fireEvent.click(screen.getByRole("button", { name: "关闭路线动效" }));
  expect(container.querySelector("#task-ci details")).toHaveAttribute("open");
  expect(progress).toEqual(before);
});

it("non-six and absent task sets are rendered honestly", () => {
  const { container, rerender } = render(
    <BeginnerPath
      roadmap={{ ...roadmap, beginnerPath: roadmap.beginnerPath.slice(0, 2) }}
      progress={progress}
    />,
  );
  expect(container.querySelector("[data-roadmap-atlas]")).toHaveAttribute(
    "data-layout",
    "list",
  );
  expect(container.querySelectorAll("[data-atlas-task]")).toHaveLength(2);
  expect(container.querySelector("[data-atlas-trail]")).toBeNull();
  expect(Observer.instances).toHaveLength(0);
  rerender(<BeginnerPath roadmap={roadmap} progress={progress} />);
  expect(Observer.instances).toHaveLength(1);
  rerender(
    <BeginnerPath
      roadmap={{ ...roadmap, beginnerPath: [] }}
      progress={progress}
    />,
  );
  expect(container).toBeEmptyDOMElement();
  expect(Observer.instances[0].disconnect).toHaveBeenCalledOnce();
  rerender(<BeginnerPath roadmap={roadmap} progress={progress} />);
  expect(Observer.instances).toHaveLength(2);
  expect(container.querySelectorAll("[data-atlas-task]")).toHaveLength(6);
});

it("modified navigation does not move the current document", () => {
  const reveal = vi.fn();
  render(
    <RoadmapAtlas tasks={roadmap.beginnerPath} mode="paused" reveal={reveal} />,
  );
  const link = screen.getByRole("link", { name: "最小 CI" });
  fireEvent.click(link, { ctrlKey: true });
  fireEvent.click(link, { shiftKey: true });
  expect(reveal).not.toHaveBeenCalled();
  fireEvent.click(link);
  expect(reveal).toHaveBeenCalledExactlyOnceWith("ci");
});

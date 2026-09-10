import { it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "@/components/layout/header";
import { Hero, Thumbnail } from "@/components/dashboard/media";
import { imageSizes } from "@/components/dashboard/image-sizes";
import { chapterGroups } from "@/lib/dashboard";
import { signIn, signOut } from "next-auth/react";
vi.mock("next/navigation", () => ({ usePathname: () => "/roadmap" }));
vi.mock("next-auth/react", () => ({
  signIn: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
}));
afterEach(() => vi.clearAllMocks());
it("public configured header starts GitHub sign in and exposes no write controls", () => {
  render(<Header login={null} owner={false} configured />);
  fireEvent.click(screen.getByRole("button", { name: "GitHub 登录" }));
  expect(signIn).toHaveBeenCalledWith("github");
  expect(screen.queryByText("回收站")).not.toBeInTheDocument();
  expect(screen.queryByText("新建")).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "学习路线" })[0]).toHaveAttribute(
    "aria-current",
    "page",
  );
});
it("unconfigured OAuth always links to settings", () => {
  render(<Header login={null} owner={false} configured={false} />);
  expect(
    screen.getByRole("link", { name: "GitHub 登录（登录未配置）" }),
  ).toHaveAttribute("href", "/settings");
  expect(
    screen.queryByRole("button", { name: "GitHub 登录" }),
  ).not.toBeInTheDocument();
});
it("owner header shows login, owner role, trash and functional sign out", () => {
  render(<Header login="huayou712-maker" owner configured />);
  expect(screen.getByText("huayou712-maker")).toBeInTheDocument();
  expect(screen.getByText("所有者")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "回收站", hidden: true }),
  ).toHaveAttribute("href", "/trash");
  fireEvent.click(
    screen.getByRole("button", { name: "退出登录", hidden: true }),
  );
  expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
});
it("other authenticated users have no owner actions", () => {
  render(<Header login="visitor" owner={false} configured />);
  expect(screen.getByText("只读访问")).toBeInTheDocument();
  expect(screen.queryByText("回收站")).not.toBeInTheDocument();
});
it("hero and thumbnail components use supplied assets and reserved image space", () => {
  const { container } = render(
    <>
      <Hero />
      <Thumbnail kind="note" index={0} slot="noteEmpty" />
      <Thumbnail kind="project" index={3} slot="portfolioSingle" />
    </>,
  );
  const sources = Array.from(container.querySelectorAll("img"), (image) =>
    decodeURIComponent(image.getAttribute("src") || ""),
  );
  expect(sources.some((s) => s.includes("hero-jianghu.webp"))).toBe(true);
  expect(sources.some((s) => s.includes("note-thumb-01.webp"))).toBe(true);
  expect(sources.some((s) => s.includes("project-thumb-04.webp"))).toBe(true);
  expect(container.querySelector(".ridge")).toBeNull();
  expect(screen.getByAltText("学习笔记配图")).toHaveAttribute(
    "sizes",
    imageSizes.noteEmpty,
  );
  expect(screen.getByAltText("项目档案配图")).toHaveAttribute(
    "sizes",
    imageSizes.portfolioSingle,
  );
  expect(screen.getByAltText("学习笔记配图")).toHaveAttribute(
    "loading",
    "lazy",
  );
});
it("four overview groups aggregate actual roadmap items, not averaged percentages", () => {
  const stages = [1, 2, 4, 7, 9, 10].map((order) => ({
    id: "stage-" + order,
    order,
    title: "Stage " + order,
    description: "",
    groups: [
      {
        id: "g" + order,
        title: "core",
        items: [{ id: "i" + order, title: "item" }],
      },
    ],
  }));
  const groups = chapterGroups(
    { version: 1, stages },
    {
      version: 1,
      updatedAt: null,
      items: { i1: { completed: true, completedAt: null, evidence: [] } },
    },
  );
  expect(groups).toHaveLength(4);
  expect(groups[0]).toMatchObject({ percent: 50, total: 2, completed: 1 });
  expect(groups.reduce((n, g) => n + g.total, 0)).toBe(6);
});

import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { workspaceCommands, navLinks } from "@/components/layout/navigation";
import { Journey } from "@/components/dashboard/journey";
import type { Roadmap, Progress } from "@/lib/models";

it("command catalogue preserves navigation and gates owner destinations", () => {
  const publicCommands = workspaceCommands(false);
  expect(publicCommands.map((command) => command.href)).toEqual(
    navLinks.map(([href]) => href),
  );
  expect(
    publicCommands.some(
      (command) => command.href === "/notes/new" || command.href === "/trash",
    ),
  ).toBe(false);
  expect(workspaceCommands(true).map((command) => command.href)).toEqual(
    expect.arrayContaining(["/notes/new", "/trash"]),
  );
});

const roadmap: Roadmap = {
  version: 1,
  stages: [1, 2].map((order) => ({
    id: "stage-" + order,
    order,
    title: "阶段" + order,
    description: "",
    groups: [
      {
        id: "g" + order,
        title: "知识",
        items: [{ id: "i" + order, title: "验证" }],
      },
    ],
  })),
};
const progress: Progress = {
  version: 1,
  updatedAt: null,
  items: {
    i1: { completed: true, completedAt: null, evidence: [] },
  },
};
it("journey represents actual completion and links to real stages", () => {
  render(<Journey roadmap={roadmap} progress={progress} currentId="stage-2" />);
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(2);
  expect(links[0]).toHaveAttribute("data-completed", "true");
  expect(links[0]).toHaveTextContent("1 / 1");
  expect(links[1]).toHaveAttribute("aria-current", "step");
  expect(links[1]).toHaveAttribute("href", "/roadmap?stage=stage-2");
  expect(links[1]).not.toHaveAttribute("data-completed");
});
it("empty stage is not shown as completed", () => {
  render(
    <Journey
      roadmap={{ version: 1, stages: [{ ...roadmap.stages[0], groups: [] }] }}
      progress={progress}
    />,
  );
  expect(screen.getByRole("link")).not.toHaveAttribute("data-completed");
  expect(screen.getByRole("link")).toHaveTextContent("0 / 0");
});

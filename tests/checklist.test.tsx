import { it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Checklist } from "@/components/roadmap/checklist";
const roadmap = {
  version: 1,
  stages: [
    {
      id: "stage-01",
      order: 1,
      title: "网络",
      description: "基础",
      groups: [
        {
          id: "network",
          title: "网络",
          items: [
            { id: "tcp", title: "TCP" },
            { id: "dns", title: "DNS" },
          ],
        },
      ],
    },
  ],
};
it("public checklist is read-only and filters completed items", () => {
  render(
    <Checklist
      roadmap={roadmap}
      progress={{
        version: 1,
        updatedAt: null,
        items: { tcp: { completed: true, completedAt: null, evidence: [] } },
      }}
    />,
  );
  expect(screen.getByRole("checkbox", { name: "TCP" })).toBeDisabled();
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "completed" },
  });
  expect(
    screen.queryByRole("checkbox", { name: "DNS" }),
  ).not.toBeInTheDocument();
});

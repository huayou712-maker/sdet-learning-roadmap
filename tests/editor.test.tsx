import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Editor } from "@/components/notes/editor";
import { ContentActions } from "@/components/notes/actions";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
it("requires public repository acknowledgement before saving", () => {
  render(<Editor roadmap={{ version: 1, stages: [] }} />);
  fireEvent.change(screen.getByLabelText("标题"), {
    target: { value: "笔记" },
  });
  expect(
    screen.getByRole("button", { name: "保存并提交到 GitHub" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/当前仓库为公开仓库/));
  expect(
    screen.getByRole("button", { name: "保存并提交到 GitHub" }),
  ).toBeEnabled();
});
it("requires confirmation before soft deletion", () => {
  render(<ContentActions id="test-note" sha={"a".repeat(40)} />);
  fireEvent.click(screen.getByRole("button", { name: "移入回收站" }));
  expect(screen.getByRole("alertdialog")).toHaveTextContent("可以恢复");
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

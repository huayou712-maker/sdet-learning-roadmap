import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentActions } from "@/components/notes/actions";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
it("requires explicit confirmation before destructive action", () => {
  render(<ContentActions id="example" sha={"a".repeat(40)} />);
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "移入回收站" }));
  expect(screen.getByRole("alertdialog")).toHaveTextContent("可以恢复");
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

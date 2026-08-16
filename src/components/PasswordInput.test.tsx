import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("renders masked by default and reveals/hides on toggle click", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" value="secret123" onChange={() => {}} />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    await user.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("keeps the visibility toggle in the natural tab order (keyboard-accessible, no tabIndex override)", () => {
    render(<PasswordInput aria-label="Password" value="" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Show password" })).not.toHaveAttribute("tabIndex");
  });

  it("can be toggled via the keyboard (Enter) without a mouse", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" value="secret123" onChange={() => {}} />);

    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Show password" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });
});

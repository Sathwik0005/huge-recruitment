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

  it("does not steal tab focus (toggle button is not in the tab order)", () => {
    render(<PasswordInput aria-label="Password" value="" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("tabIndex", "-1");
  });
});

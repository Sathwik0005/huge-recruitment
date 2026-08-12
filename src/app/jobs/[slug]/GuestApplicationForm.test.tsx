import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@vercel/blob/client", () => ({
  upload: vi.fn(),
}));

import { GuestApplicationForm } from "./GuestApplicationForm";

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("GuestApplicationForm", () => {
  it("shows a non-applicable state instead of the form when the job is closed", () => {
    render(<GuestApplicationForm jobId="job-1" isOpen={false} />);
    expect(screen.getByText("This role is no longer accepting applications")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Full name/)).not.toBeInTheDocument();
  });

  it("shows inline validation errors for empty required fields on submit", async () => {
    const user = userEvent.setup();
    render(<GuestApplicationForm jobId="job-1" isOpen={true} />);

    await user.click(screen.getByRole("button", { name: "Submit application" }));

    expect(await screen.findByText("Full name is required.")).toBeInTheDocument();
    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Phone number is required.")).toBeInTheDocument();
    expect(screen.getByText("Current location is required.")).toBeInTheDocument();
    expect(screen.getByText("You must accept the Privacy Policy to continue.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits successfully and shows the reference confirmation", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ publicReference: "APP-ABC123" }),
    } as Response);

    const user = userEvent.setup();
    render(<GuestApplicationForm jobId="job-1" isOpen={true} />);

    await user.type(screen.getByLabelText(/Full name/), "Jane Doe");
    await user.type(screen.getByLabelText(/Email address/), "jane@example.com");
    await user.type(screen.getByLabelText(/Phone number/), "07123456789");
    await user.type(screen.getByLabelText(/Current location/), "Foston");
    await user.click(screen.getByRole("checkbox", { name: /Privacy Policy/ }));
    await user.click(screen.getByRole("button", { name: "Submit application" }));

    expect(await screen.findByText("Application received")).toBeInTheDocument();
    expect(screen.getByText("APP-ABC123")).toBeInTheDocument();
  });

  it("shows a form-level error and preserves entered values on a recoverable server error", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "This job is no longer accepting applications." }),
    } as Response);

    const user = userEvent.setup();
    render(<GuestApplicationForm jobId="job-1" isOpen={true} />);

    await user.type(screen.getByLabelText(/Full name/), "Jane Doe");
    await user.type(screen.getByLabelText(/Email address/), "jane@example.com");
    await user.type(screen.getByLabelText(/Phone number/), "07123456789");
    await user.type(screen.getByLabelText(/Current location/), "Foston");
    await user.click(screen.getByRole("checkbox", { name: /Privacy Policy/ }));
    await user.click(screen.getByRole("button", { name: "Submit application" }));

    await waitFor(() => {
      expect(screen.getByText("This job is no longer accepting applications.")).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Full name/)).toHaveValue("Jane Doe");
  });

  it("disables submit and shows a honeypot field that is empty by default", () => {
    render(<GuestApplicationForm jobId="job-1" isOpen={true} />);
    const honeypot = screen.getByLabelText("Company website") as HTMLInputElement;
    expect(honeypot).toHaveValue("");
    expect(honeypot).toHaveAttribute("tabIndex", "-1");
  });
});

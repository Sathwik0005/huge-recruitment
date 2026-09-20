import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Step4Form } from "./Step4Form";

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

/**
 * jsdom doesn't lay out elements, so scrollHeight/clientHeight are always 0 —
 * `handleDeclarationScroll`'s "within threshold of the bottom" check
 * (scrollHeight - scrollTop - clientHeight <= threshold) is satisfied by
 * that default (0 - 0 - 0 = 0), so firing a scroll event is enough to
 * simulate "scrolled to the end" without needing to mock layout metrics.
 */
function fireScrolledToEnd(container: HTMLElement) {
  const scrollBox = container.querySelector(".overflow-y-auto") as HTMLElement;
  fireEvent.scroll(scrollBox);
}

describe("Step4Form", () => {
  it("renders the declaration text, including the first and last section headings", () => {
    render(<Step4Form initialValues={null} onSubmitted={vi.fn()} onAvatarMissing={vi.fn()} />);
    expect(screen.getByText("1. PURPOSE OF THIS DECLARATION")).toBeInTheDocument();
    expect(screen.getByText("18. RAISING QUESTIONS OR CONCERNS")).toBeInTheDocument();
    expect(screen.getByText("19. EMPLOYEE CONFIRMATION")).toBeInTheDocument();
  });

  it("keeps the confirmation checkbox disabled until the declaration is scrolled to the end", () => {
    const { container } = render(<Step4Form initialValues={null} onSubmitted={vi.fn()} onAvatarMissing={vi.fn()} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();

    fireScrolledToEnd(container);
    expect(checkbox).not.toBeDisabled();
  });

  it("keeps Save & Submit disabled until the checkbox is checked", async () => {
    const user = userEvent.setup();
    const { container } = render(<Step4Form initialValues={null} onSubmitted={vi.fn()} onAvatarMissing={vi.fn()} />);
    const submitButton = screen.getByRole("button", { name: /save & submit/i });
    expect(submitButton).toBeDisabled();

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    expect(submitButton).not.toBeDisabled();
  });

  it("requires a full name before a submit is accepted", async () => {
    const user = userEvent.setup();
    const { container } = render(<Step4Form initialValues={null} onSubmitted={vi.fn()} onAvatarMissing={vi.fn()} />);

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /save & submit/i }));

    expect(await screen.findByText("Full name is required.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("surfaces the avatar-missing error and calls onAvatarMissing when the server blocks submission", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "A profile picture is required before you can submit.", field: "avatar" }),
    });
    const onAvatarMissing = vi.fn();
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Step4Form initialValues={null} onSubmitted={onSubmitted} onAvatarMissing={onAvatarMissing} />,
    );

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/Full Name/i), "Sathwik User");
    await user.click(screen.getByRole("button", { name: /save & submit/i }));

    expect(await screen.findByText("A profile picture is required before you can submit.")).toBeInTheDocument();
    expect(onAvatarMissing).toHaveBeenCalledTimes(1);
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("calls onSubmitted on a fully successful submit, sending declarationAccepted: true", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ candidateProfile: {} }),
    });
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<Step4Form initialValues={null} onSubmitted={onSubmitted} onAvatarMissing={vi.fn()} />);

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/Full Name/i), "Sathwik User");
    await user.click(screen.getByRole("button", { name: /save & submit/i }));

    expect(onSubmitted).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({ intent: "submit", declarationFullName: "Sathwik User", declarationAccepted: true });
  });

  it("blocks interaction and fires onLockedInteraction when readOnly", () => {
    const onLockedInteraction = vi.fn();
    const { container } = render(
      <Step4Form
        initialValues={{ declarationFullName: "Sathwik User", declarationAcceptedAt: "2026-01-01T00:00:00.000Z" }}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
        readOnly
        onLockedInteraction={onLockedInteraction}
      />,
    );

    const overlay = container.querySelector('[role="presentation"]');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay as Element);

    expect(onLockedInteraction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /save & submit/i })).not.toBeInTheDocument();
  });
});

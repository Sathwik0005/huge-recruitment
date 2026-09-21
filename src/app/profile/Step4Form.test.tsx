import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Step4Form } from "./Step4Form";

const SAVED_SIGNATURE_URL = "https://s3.example.com/signed/signature.png";

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

/**
 * jsdom has no real canvas renderer — stub `getContext`/`toBlob` so
 * SignaturePad's draw-then-save flow can run without the `canvas` npm
 * package. `setPointerCapture` is called via an optional chain in the
 * component, so it doesn't need stubbing.
 */
function stubCanvas() {
  const ctx = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
  ) {
    callback(new Blob(["fake-png-bytes"], { type: "image/png" }));
  });
}

function drawOnCanvas(canvas: Element) {
  fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
  fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });
  fireEvent.pointerUp(canvas);
}

describe("Step4Form", () => {
  it("renders the declaration text, including the first and last section headings", () => {
    render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={null}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
      />,
    );
    expect(screen.getByText("1. PURPOSE OF THIS DECLARATION")).toBeInTheDocument();
    expect(screen.getByText("18. RAISING QUESTIONS OR CONCERNS")).toBeInTheDocument();
    expect(screen.getByText("19. EMPLOYEE CONFIRMATION")).toBeInTheDocument();
  });

  it("keeps the confirmation checkbox disabled until the declaration is scrolled to the end", () => {
    const { container } = render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={null}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
      />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();

    fireScrolledToEnd(container);
    expect(checkbox).not.toBeDisabled();
  });

  it("starts unticked on a fresh run, even when Save & Submit stays clickable", () => {
    render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={null}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: /save & submit/i })).not.toBeDisabled();
  });

  it("starts unticked when an admin has unlocked an already-submitted profile for re-editing, not carried over as checked", () => {
    render(
      <Step4Form
        initialValues={{ declarationFullName: "Sathwik User", declarationAcceptedAt: "2026-01-01T00:00:00.000Z" }}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
        readOnly={false}
      />,
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("starts ticked (and disabled) when viewing an already-submitted, locked profile", () => {
    render(
      <Step4Form
        initialValues={{ declarationFullName: "Sathwik User", declarationAcceptedAt: "2026-01-01T00:00:00.000Z" }}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
        readOnly
      />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  });

  it("calls onDeclarationNotAccepted (not an inline error, button stays clickable) when submitting before the checkbox is ticked", async () => {
    const onDeclarationNotAccepted = vi.fn();
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={onSubmitted}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={onDeclarationNotAccepted}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /save & submit/i });
    expect(submitButton).not.toBeDisabled();
    await user.click(submitButton);

    expect(onDeclarationNotAccepted).toHaveBeenCalledTimes(1);
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("keeps the declaration text scrollable (outside the lock overlay) even when readOnly", () => {
    const { container } = render(
      <Step4Form
        initialValues={{ declarationFullName: "Sathwik User", declarationAcceptedAt: "2026-01-01T00:00:00.000Z" }}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
        readOnly
      />,
    );
    const overlay = container.querySelector('[role="presentation"]');
    const scrollBox = container.querySelector(".overflow-y-auto");
    expect(overlay).not.toBeNull();
    expect(scrollBox).not.toBeNull();
    expect(overlay?.contains(scrollBox)).toBe(false);
  });

  it("pre-fills the Date field with today and caps the calendar picker at today", () => {
    render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={null}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
      />,
    );
    const dateInput = screen.getByLabelText(/Date/i) as HTMLInputElement;
    const today = new Date().toISOString().slice(0, 10);
    expect(dateInput).toHaveAttribute("type", "date");
    expect(dateInput.value).toBe(today);
    expect(dateInput).toHaveAttribute("max", today);
  });

  it("requires a full name before a submit is accepted", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
      />,
    );

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /save & submit/i }));

    expect(await screen.findByText("Full name is required.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("requires a date before a submit is accepted", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
      />,
    );

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/Full Name/i), "Sathwik User");
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: /save & submit/i }));

    expect(await screen.findByText("Date is required.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls onAvatarMissing (not an inline error) when the server blocks submission for a missing avatar", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "A profile picture is required before you can submit.", field: "avatar" }),
    });
    const onAvatarMissing = vi.fn();
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={onSubmitted}
        onAvatarMissing={onAvatarMissing}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
      />,
    );

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/Full Name/i), "Sathwik User");
    await user.click(screen.getByRole("button", { name: /save & submit/i }));

    await vi.waitFor(() => expect(onAvatarMissing).toHaveBeenCalledTimes(1));
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(screen.queryByText("A profile picture is required before you can submit.")).not.toBeInTheDocument();
  });

  it("calls onSignatureMissing (not an inline error) when the client already knows no signature was saved", async () => {
    const onSignatureMissing = vi.fn();
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={null}
        onSubmitted={onSubmitted}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={onSignatureMissing}
        onDeclarationNotAccepted={vi.fn()}
      />,
    );

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/Full Name/i), "Sathwik User");
    await user.click(screen.getByRole("button", { name: /save & submit/i }));

    expect(onSignatureMissing).toHaveBeenCalledTimes(1);
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls onSubmitted on a fully successful submit, sending the date and declarationAccepted: true", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ candidateProfile: {} }),
    });
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={onSubmitted}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
      />,
    );

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/Full Name/i), "Sathwik User");
    await user.click(screen.getByRole("button", { name: /save & submit/i }));

    expect(onSubmitted).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toMatchObject({ intent: "submit", declarationFullName: "Sathwik User", declarationAccepted: true });
    expect(body.declarationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("draws and saves a signature via the pad, which locks the canvas and unlocks submission end-to-end", async () => {
    stubCanvas();
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === "/api/candidate/profile/step-4/signature") {
        return Promise.resolve({ ok: true, json: async () => ({ s3Key: "candidates/u1/step-4/signature/x.png" }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ candidateProfile: {} }) });
    });
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={null}
        onSubmitted={onSubmitted}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
      />,
    );

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/Full Name/i), "Sathwik User");

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    drawOnCanvas(canvas);
    await user.click(screen.getByRole("button", { name: /save signature/i }));

    // Locked after save: Clear/Save Signature give way to a "Signature Saved" status + Edit.
    expect(await screen.findByText("Signature Saved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^clear$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save signature/i })).not.toBeInTheDocument();
    const editButton = screen.getByRole("button", { name: /^edit$/i });

    await user.click(screen.getByRole("button", { name: /save & submit/i }));
    expect(onSubmitted).toHaveBeenCalledTimes(1);

    // A stray tap on the locked canvas must not add a stroke.
    drawOnCanvas(canvas);
    expect(screen.queryByRole("button", { name: /save signature/i })).not.toBeInTheDocument();

    await user.click(editButton);
    expect(screen.getByRole("button", { name: /^clear$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save signature/i })).toBeInTheDocument();
  });

  it("blocks interaction on the confirmation card and fires onLockedInteraction when readOnly", () => {
    const onLockedInteraction = vi.fn();
    const { container } = render(
      <Step4Form
        initialValues={{ declarationFullName: "Sathwik User", declarationAcceptedAt: "2026-01-01T00:00:00.000Z" }}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
        onSignatureMissing={vi.fn()}
        onDeclarationNotAccepted={vi.fn()}
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

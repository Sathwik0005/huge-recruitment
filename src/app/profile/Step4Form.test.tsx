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
    render(<Step4Form initialValues={null} initialSignatureUrl={null} onSubmitted={vi.fn()} onAvatarMissing={vi.fn()} />);
    expect(screen.getByText("1. PURPOSE OF THIS DECLARATION")).toBeInTheDocument();
    expect(screen.getByText("18. RAISING QUESTIONS OR CONCERNS")).toBeInTheDocument();
    expect(screen.getByText("19. EMPLOYEE CONFIRMATION")).toBeInTheDocument();
  });

  it("keeps the confirmation checkbox disabled until the declaration is scrolled to the end", () => {
    const { container } = render(
      <Step4Form initialValues={null} initialSignatureUrl={null} onSubmitted={vi.fn()} onAvatarMissing={vi.fn()} />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();

    fireScrolledToEnd(container);
    expect(checkbox).not.toBeDisabled();
  });

  it("keeps Save & Submit disabled until the checkbox is checked, even with a signature already saved", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
      />,
    );
    const submitButton = screen.getByRole("button", { name: /save & submit/i });
    expect(submitButton).toBeDisabled();

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    expect(submitButton).not.toBeDisabled();
  });

  it("keeps Save & Submit disabled when no signature has been saved, even once the checkbox is checked", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Step4Form initialValues={null} initialSignatureUrl={null} onSubmitted={vi.fn()} onAvatarMissing={vi.fn()} />,
    );
    const submitButton = screen.getByRole("button", { name: /save & submit/i });

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    expect(submitButton).toBeDisabled();
  });

  it("requires a full name before a submit is accepted", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={vi.fn()}
        onAvatarMissing={vi.fn()}
      />,
    );

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
      <Step4Form
        initialValues={null}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={onSubmitted}
        onAvatarMissing={onAvatarMissing}
      />,
    );

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/Full Name/i), "Sathwik User");
    await user.click(screen.getByRole("button", { name: /save & submit/i }));

    expect(await screen.findByText("A profile picture is required before you can submit.")).toBeInTheDocument();
    expect(onAvatarMissing).toHaveBeenCalledTimes(1);
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("surfaces a signature-missing server error inline without calling onSubmitted", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Please draw your signature before you can submit.", field: "signature" }),
    });
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Step4Form
        initialValues={null}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
        onSubmitted={onSubmitted}
        onAvatarMissing={vi.fn()}
      />,
    );

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/Full Name/i), "Sathwik User");
    await user.click(screen.getByRole("button", { name: /save & submit/i }));

    expect(await screen.findByText("Please draw your signature before you can submit.")).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("calls onSubmitted on a fully successful submit, sending declarationAccepted: true", async () => {
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
      />,
    );

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/Full Name/i), "Sathwik User");
    await user.click(screen.getByRole("button", { name: /save & submit/i }));

    expect(onSubmitted).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({ intent: "submit", declarationFullName: "Sathwik User", declarationAccepted: true });
  });

  it("draws and saves a signature via the pad, which unlocks submission end-to-end", async () => {
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
      <Step4Form initialValues={null} initialSignatureUrl={null} onSubmitted={onSubmitted} onAvatarMissing={vi.fn()} />,
    );

    fireScrolledToEnd(container);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/Full Name/i), "Sathwik User");

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    drawOnCanvas(canvas);
    await user.click(screen.getByRole("button", { name: /save signature/i }));
    expect(await screen.findByRole("button", { name: /signature saved/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save & submit/i }));
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it("blocks interaction and fires onLockedInteraction when readOnly", () => {
    const onLockedInteraction = vi.fn();
    const { container } = render(
      <Step4Form
        initialValues={{ declarationFullName: "Sathwik User", declarationAcceptedAt: "2026-01-01T00:00:00.000Z" }}
        initialSignatureUrl={SAVED_SIGNATURE_URL}
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

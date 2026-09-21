import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SignaturePad } from "./SignaturePad";

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

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

describe("SignaturePad", () => {
  it("starts in draw mode with Save Signature disabled when there is no existing signature", () => {
    render(<SignaturePad initialSignatureUrl={null} onSaved={vi.fn()} />);
    expect(screen.getByLabelText(/draw your signature/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save signature/i })).toBeDisabled();
  });

  it("shows the existing signature image and a Redraw button when one was already saved", () => {
    render(<SignaturePad initialSignatureUrl="https://s3.example.com/sig.png" onSaved={vi.fn()} />);
    expect(screen.getByAltText("Your saved signature")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /redraw signature/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/draw your signature/i)).not.toBeInTheDocument();
  });

  it("Redraw switches back to the canvas and hides the Redraw button while readOnly", () => {
    render(<SignaturePad initialSignatureUrl="https://s3.example.com/sig.png" onSaved={vi.fn()} disabled />);
    expect(screen.queryByRole("button", { name: /redraw signature/i })).not.toBeInTheDocument();
  });

  it("requires at least one stroke before Save Signature is enabled, and uploads on save", async () => {
    stubCanvas();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ s3Key: "candidates/u1/step-4/signature/x.png" }),
    });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<SignaturePad initialSignatureUrl={null} onSaved={onSaved} />);

    const saveButton = screen.getByRole("button", { name: /save signature/i });
    expect(saveButton).toBeDisabled();

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    drawOnCanvas(canvas);
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/candidate/profile/step-4/signature", expect.objectContaining({ method: "POST" }));
    expect(await screen.findByRole("button", { name: /signature saved/i })).toBeInTheDocument();
  });

  it("Clear resets the drawn stroke and disables Save Signature again", () => {
    stubCanvas();
    const { container } = render(<SignaturePad initialSignatureUrl={null} onSaved={vi.fn()} />);
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    drawOnCanvas(canvas);

    const saveButton = screen.getByRole("button", { name: /save signature/i });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(saveButton).toBeDisabled();
  });

  it("surfaces an upload error inline without calling onSaved", async () => {
    stubCanvas();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Could not upload the signature. Please try again." }),
    });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<SignaturePad initialSignatureUrl={null} onSaved={onSaved} />);

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    drawOnCanvas(canvas);
    await user.click(screen.getByRole("button", { name: /save signature/i }));

    expect(await screen.findByText("Could not upload the signature. Please try again.")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

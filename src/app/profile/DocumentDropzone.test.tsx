import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DocumentDropzone } from "./DocumentDropzone";

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  // jsdom doesn't implement createObjectURL/revokeObjectURL.
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

function pdfFile(name = "statement.pdf") {
  return new File(["%PDF-1.4"], name, { type: "application/pdf" });
}

function imageFile(name = "front.png") {
  return new File(["fake-image-bytes"], name, { type: "image/png" });
}

describe("DocumentDropzone", () => {
  it("shows the required marker when required is true", () => {
    render(
      <DocumentDropzone
        slot="bankStatement"
        label="Proof of Bank Account Details"
        required
        accept="application/pdf"
        acceptHint="PDF only"
        onUploaded={vi.fn()}
      />,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("uploads the selected file with the correct slot field and calls onUploaded on success", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ s3Key: "candidates/u1/step-3/bankStatement/x.pdf", originalFilename: "statement.pdf", slot: "bankStatement" }),
    });
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentDropzone
        slot="bankStatement"
        label="Proof of Bank Account Details"
        accept="application/pdf"
        acceptHint="PDF only"
        onUploaded={onUploaded}
      />,
    );

    const input = document.getElementById("document-dropzone-bankStatement") as HTMLInputElement;
    await user.upload(input, pdfFile());

    expect(await screen.findByText("statement.pdf")).toBeInTheDocument();
    expect(onUploaded).toHaveBeenCalledWith("candidates/u1/step-3/bankStatement/x.pdf", "statement.pdf");

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/candidate/profile/step-3/documents");
    const body = init.body as FormData;
    expect(body.get("slot")).toBe("bankStatement");
    expect(body.get("file")).toBeInstanceOf(File);
  });

  it("shows an error and does not call onUploaded when the server rejects the upload", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "File must be one of: .pdf." }),
    });
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentDropzone
        slot="bankStatement"
        label="Proof of Bank Account Details"
        accept="application/pdf"
        acceptHint="PDF only"
        onUploaded={onUploaded}
      />,
    );

    const input = document.getElementById("document-dropzone-bankStatement") as HTMLInputElement;
    await user.upload(input, pdfFile());

    expect(await screen.findByText("File must be one of: .pdf.")).toBeInTheDocument();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("clears the preview and calls onRemove when the remove button is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ s3Key: "k", originalFilename: "front.png", slot: "rightToWorkFront" }),
    });
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentDropzone
        slot="rightToWorkFront"
        label="Passport (Front Cover)"
        accept="image/jpeg, image/png, application/pdf"
        acceptHint="jpg/png/pdf"
        onUploaded={vi.fn()}
        onRemove={onRemove}
      />,
    );

    const input = document.getElementById("document-dropzone-rightToWorkFront") as HTMLInputElement;
    await user.upload(input, imageFile());
    expect(await screen.findByText("front.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove attachment/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("front.png")).not.toBeInTheDocument();
  });

  it("renders a previously-uploaded filename via initialFilename", () => {
    render(
      <DocumentDropzone
        slot="bankStatement"
        label="Proof of Bank Account Details"
        accept="application/pdf"
        acceptHint="PDF only"
        initialFilename="already-uploaded.pdf"
        onUploaded={vi.fn()}
      />,
    );
    expect(screen.getByText("already-uploaded.pdf")).toBeInTheDocument();
  });
});

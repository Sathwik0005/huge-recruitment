import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { Step3Form } from "./Step3Form";

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("Step3Form", () => {
  it("shows no document-type-specific fields until a pill is selected", () => {
    render(<Step3Form initialValues={null} onContinue={vi.fn()} />);
    expect(screen.queryByLabelText(/Visa Expiry Date/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Right to Work Share Code/i)).not.toBeInTheDocument();
  });

  it("selecting Passport shows visa fields and hides ID Card / BRP fields", async () => {
    const user = userEvent.setup();
    render(<Step3Form initialValues={null} onContinue={vi.fn()} />);

    await user.click(screen.getByText("Passport"));

    expect(screen.getByLabelText(/Visa Expiry Date/i)).toBeInTheDocument();
    expect(screen.queryByText("Residency Verification Subtype:")).not.toBeInTheDocument();
  });

  it("selecting BRP / E-Visa reveals the physical/e-visa sub-toggle, and switching branches swaps the fields", async () => {
    const user = userEvent.setup();
    render(<Step3Form initialValues={null} onContinue={vi.fn()} />);

    await user.click(screen.getByText("BRP / E-Visa"));
    expect(screen.getByText("Residency Verification Subtype:")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Physical BRP Card"));
    expect(screen.getByText("Residence Permit (Front)")).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Digital Status/i));
    expect(screen.queryByText("Residence Permit (Front)")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Status Expiry Date/i)).toBeInTheDocument();
  });

  it("Save & Continue runs client-side validation before any network call", async () => {
    const user = userEvent.setup();
    render(<Step3Form initialValues={null} onContinue={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    expect(await screen.findByText("Please select an identity document type.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls onContinue on a fully successful save", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ candidateProfile: {} }),
    });
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(
      <Step3Form
        initialValues={{
          rightToWorkDocumentType: "PASSPORT",
          brpSubtype: null,
          visaExpiryDate: "2030-01-01",
          rightToWorkShareCode: "W12345678",
          rightToWorkShareCodeExpiryDate: null,
          rightToWorkDocFrontS3Key: "k1",
          rightToWorkDocFrontOriginalFilename: "front.png",
          rightToWorkDocBackS3Key: "k2",
          rightToWorkDocBackOriginalFilename: "back.png",
          bankAccountHolderName: "Sathwik User",
          bankAccountNumber: "12345678",
          bankSortCode: "204578",
          bankStatementS3Key: "k3",
          bankStatementOriginalFilename: "statement.pdf",
        }}
        onContinue={onContinue}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("surfaces a server-side error inline without advancing when the save fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Something went wrong. Please try again." }),
    });
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(
      <Step3Form
        initialValues={{
          rightToWorkDocumentType: "PASSPORT",
          brpSubtype: null,
          visaExpiryDate: "2030-01-01",
          rightToWorkShareCode: "W12345678",
          rightToWorkShareCodeExpiryDate: null,
          rightToWorkDocFrontS3Key: "k1",
          rightToWorkDocFrontOriginalFilename: "front.png",
          rightToWorkDocBackS3Key: "k2",
          rightToWorkDocBackOriginalFilename: "back.png",
          bankAccountHolderName: "Sathwik User",
          bankAccountNumber: "12345678",
          bankSortCode: "204578",
          bankStatementS3Key: "k3",
          bankStatementOriginalFilename: "statement.pdf",
        }}
        onContinue={onContinue}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("leaves the account holder name empty when there's no existing draft value (no auto-fill)", () => {
    render(<Step3Form initialValues={null} onContinue={vi.fn()} />);
    expect(screen.getByLabelText(/Account Holder Name/i)).toHaveValue("");
  });

  it("auto-formats the sort code with dashes as the candidate types", async () => {
    const user = userEvent.setup();
    render(<Step3Form initialValues={null} onContinue={vi.fn()} />);

    const sortCodeInput = screen.getByLabelText(/Sort Code/i);
    await user.type(sortCodeInput, "204578");
    expect(sortCodeInput).toHaveValue("20-45-78");
  });

  it("does not allow more than 8 digits to be entered into the account number field", async () => {
    const user = userEvent.setup();
    render(<Step3Form initialValues={null} onContinue={vi.fn()} />);

    const accountNumberInput = screen.getByLabelText(/Account Number/i);
    await user.type(accountNumberInput, "1234567890123");
    expect(accountNumberInput).toHaveValue("12345678");
  });

  it("shows an 8-digit-specific error message for an incomplete account number on submit", async () => {
    const user = userEvent.setup();
    render(<Step3Form initialValues={null} onContinue={vi.fn()} />);

    await user.click(screen.getByText("Passport"));
    await user.type(screen.getByLabelText(/Account Number/i), "1234");
    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    expect(await screen.findByText("Account number must be exactly 8 digits.")).toBeInTheDocument();
  });

  it("Save Draft & Exit skips client-side validation", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({}) });
    const user = userEvent.setup();
    render(<Step3Form initialValues={null} onContinue={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /save draft & exit/i }));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/candidate/profile/step-3",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.intent).toBe("draft");
  });
});

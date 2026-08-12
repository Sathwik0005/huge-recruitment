import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
let currentParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => currentParams,
}));

import { JobFilters } from "./JobFilters";

beforeEach(() => {
  vi.clearAllMocks();
  currentParams = new URLSearchParams();
});

const SECTORS = [{ name: "WAREHOUSING", label: "Warehousing" }];

describe("JobFilters", () => {
  it("updates the URL with a sector filter when a checkbox is toggled", async () => {
    const user = userEvent.setup();
    render(
      <JobFilters sectors={SECTORS}>
        <div>results</div>
      </JobFilters>
    );

    await user.click(screen.getByRole("checkbox", { name: "Warehousing" }));

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("sector=WAREHOUSING"));
  });

  it("debounces the keyword input before pushing to the URL", async () => {
    vi.useFakeTimers();
    try {
      render(
        <JobFilters sectors={SECTORS}>
          <div>results</div>
        </JobFilters>
      );

      fireEvent.change(screen.getByPlaceholderText("Job title or keyword"), { target: { value: "warehouse" } });
      expect(mockPush).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(400);
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("keyword=warehouse"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("disables minimum pay until a pay period is chosen", () => {
    render(
      <JobFilters sectors={SECTORS}>
        <div>results</div>
      </JobFilters>
    );

    expect(screen.getByLabelText("Minimum pay")).toBeDisabled();
  });

  it("only offers pay-based sort options once a pay period is selected", async () => {
    const user = userEvent.setup();
    render(
      <JobFilters sectors={SECTORS}>
        <div>results</div>
      </JobFilters>
    );

    const sortSelect = screen.getByLabelText("Sort by") as HTMLSelectElement;
    expect(Array.from(sortSelect.options).map((o) => o.value)).toEqual(["newest", "oldest"]);

    await user.selectOptions(screen.getByLabelText("Pay period"), "HOUR");

    expect(Array.from(sortSelect.options).map((o) => o.value)).toEqual([
      "newest",
      "oldest",
      "pay-asc",
      "pay-desc",
    ]);
  });

  it("clears all filters and navigates to the base /jobs URL", async () => {
    const user = userEvent.setup();
    render(
      <JobFilters sectors={SECTORS}>
        <div>results</div>
      </JobFilters>
    );

    await user.click(screen.getByRole("checkbox", { name: "Warehousing" }));
    mockPush.mockClear();

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(mockPush).toHaveBeenCalledWith("/jobs");
  });
});

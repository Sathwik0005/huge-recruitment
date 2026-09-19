import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchableSelect } from "./SearchableSelect";

const OPTIONS = [
  { value: "GB", label: "United Kingdom" },
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "PK", label: "Pakistan" },
];

describe("SearchableSelect", () => {
  it("renders closed with the placeholder when no value is selected", () => {
    render(<SearchableSelect id="test" value="" onChange={vi.fn()} options={OPTIONS} placeholder="Select an option" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Select an option");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows the selected option's label, not its raw value", () => {
    render(<SearchableSelect id="test" value="GB" onChange={vi.fn()} options={OPTIONS} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("United Kingdom");
  });

  it("opens the dropdown with a search input on click", async () => {
    const user = userEvent.setup();
    render(<SearchableSelect id="test" value="" onChange={vi.fn()} options={OPTIONS} searchPlaceholder="Search countries..." />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search countries...")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(OPTIONS.length);
  });

  it("filters options case-insensitively by name as the user types", async () => {
    const user = userEvent.setup();
    render(<SearchableSelect id="test" value="" onChange={vi.fn()} options={OPTIONS} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("searchbox"), "united");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options.map((option) => option.textContent)).toEqual(["United Kingdom", "United States"]);
  });

  it("filters options by code as well as name", async () => {
    const user = userEvent.setup();
    render(<SearchableSelect id="test" value="" onChange={vi.fn()} options={OPTIONS} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("searchbox"), "us");
    expect(screen.getByRole("option")).toHaveTextContent("United States");
  });

  it("shows the no-results state for an unmatched query", async () => {
    const user = userEvent.setup();
    render(<SearchableSelect id="test" value="" onChange={vi.fn()} options={OPTIONS} noResultsText="No nationality found" />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("searchbox"), "zzz-not-a-country");
    expect(screen.getByText("No nationality found")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("calls onChange and closes the dropdown when an option is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchableSelect id="test" value="" onChange={onChange} options={OPTIONS} />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("India"));
    expect(onChange).toHaveBeenCalledWith("IN");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports arrow-key navigation and Enter selection", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchableSelect id="test" value="" onChange={onChange} options={OPTIONS} />);
    await user.click(screen.getByRole("combobox"));
    const search = screen.getByRole("searchbox");
    await user.type(search, "{ArrowDown}{ArrowDown}{Enter}");
    // Options order: United Kingdom(0), India(1), United States(2), Pakistan(3) — starting
    // highlighted index is 0, so two ArrowDowns lands on United States (index 2).
    expect(onChange).toHaveBeenCalledWith("US");
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    render(<SearchableSelect id="test" value="" onChange={vi.fn()} options={OPTIONS} disabled />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

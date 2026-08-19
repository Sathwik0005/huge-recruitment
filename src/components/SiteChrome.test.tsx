import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

import SiteChrome from "./SiteChrome";

beforeEach(() => {
  pathname = "/";
});

describe("SiteChrome", () => {
  it("hides the normal header and footer on the shared auth-action page", () => {
    pathname = "/auth/action";

    render(
      <SiteChrome header={<header>Header</header>} footer={<footer>Footer</footer>}>
        <main>Action state</main>
      </SiteChrome>,
    );

    expect(screen.getByText("Action state")).toBeInTheDocument();
    expect(screen.queryByText("Header")).not.toBeInTheDocument();
    expect(screen.queryByText("Footer")).not.toBeInTheDocument();
  });

  it("keeps the normal site chrome on public pages", () => {
    pathname = "/jobs";

    render(
      <SiteChrome header={<header>Header</header>} footer={<footer>Footer</footer>}>
        <main>Jobs</main>
      </SiteChrome>,
    );

    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });
});
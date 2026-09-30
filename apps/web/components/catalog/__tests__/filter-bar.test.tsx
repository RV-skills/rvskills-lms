// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../filter-bar";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

const replace = vi.fn();
const mockUseRouter = vi.mocked(useRouter);
const mockUsePathname = vi.mocked(usePathname);
const mockUseSearchParams = vi.mocked(useSearchParams);

function setSearchParams(params: Record<string, string> = {}) {
  mockUseSearchParams.mockReturnValue(new URLSearchParams(params) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseRouter.mockReturnValue({ replace } as never);
  mockUsePathname.mockReturnValue("/catalog");
  setSearchParams();
});

describe("FilterBar: search", () => {
  it("updates the URL's search param when the Search button is clicked", async () => {
    const user = userEvent.setup();
    render(<FilterBar />);

    await user.type(screen.getByPlaceholderText(/search courses/i), "react");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(replace).toHaveBeenCalledWith("/catalog?search=react");
  });

  it("also updates the URL when Enter is pressed in the search box", async () => {
    const user = userEvent.setup();
    render(<FilterBar />);

    await user.type(screen.getByPlaceholderText(/search courses/i), "react{Enter}");

    expect(replace).toHaveBeenCalledWith("/catalog?search=react");
  });

  it("removes the search param entirely when cleared", async () => {
    const user = userEvent.setup();
    setSearchParams({ search: "react" });
    render(<FilterBar />);

    const input = screen.getByPlaceholderText(/search courses/i);
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(replace).toHaveBeenCalledWith("/catalog?");
  });

  it("pre-fills the search box from the current URL", () => {
    setSearchParams({ search: "typescript" });
    render(<FilterBar />);

    expect(screen.getByPlaceholderText(/search courses/i)).toHaveValue("typescript");
  });
});

describe("FilterBar: difficulty", () => {
  it("marks 'All categories' active when no difficulty is set", () => {
    render(<FilterBar />);
    const allButton = screen.getByRole("button", { name: /all categories/i });
    expect(allButton.className).toContain("bg-primary-500");
  });

  it("marks the matching difficulty button active from the URL", () => {
    setSearchParams({ difficulty: "advanced" });
    render(<FilterBar />);
    const advancedButton = screen.getByRole("button", { name: /^advanced$/i });
    expect(advancedButton.className).toContain("bg-primary-500");
  });

  it("updates the URL's difficulty param when a difficulty button is clicked", async () => {
    const user = userEvent.setup();
    render(<FilterBar />);

    await user.click(screen.getByRole("button", { name: /^intermediate$/i }));

    expect(replace).toHaveBeenCalledWith("/catalog?difficulty=intermediate");
  });

  it("preserves an existing search param when changing difficulty", async () => {
    const user = userEvent.setup();
    setSearchParams({ search: "react" });
    render(<FilterBar />);

    await user.click(screen.getByRole("button", { name: /^beginner$/i }));

    expect(replace).toHaveBeenCalledWith("/catalog?search=react&difficulty=beginner");
  });

  it("removes the difficulty param when 'All categories' is clicked", async () => {
    const user = userEvent.setup();
    setSearchParams({ difficulty: "advanced" });
    render(<FilterBar />);

    await user.click(screen.getByRole("button", { name: /all categories/i }));

    expect(replace).toHaveBeenCalledWith("/catalog?");
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarNav } from "../sidebar-nav";
import { useSession, logout } from "@/lib/user-session";
import { usePathname } from "next/navigation";

vi.mock("@/lib/user-session", () => ({
  useSession: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

const mockUseSession = vi.mocked(useSession);
const mockLogout = vi.mocked(logout);
const mockUsePathname = vi.mocked(usePathname);

const USER = {
  user_id: "u-1",
  first_name: "Jane",
  last_name: "Doe",
  email: "jane@rvskills.com",
  username: "janedoe",
};

const originalLocation = window.location;

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePathname.mockReturnValue("/dashboard");
  Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "" },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", { writable: true, value: originalLocation });
});

describe("SidebarNav: loading state", () => {
  it("renders neither the nav links nor the login prompt while loading", () => {
    mockUseSession.mockReturnValue({ user: null, loading: true });
    render(<SidebarNav />);

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
  });
});

describe("SidebarNav: logged out", () => {
  it("shows Login and Sign up links, not the nav", () => {
    mockUseSession.mockReturnValue({ user: null, loading: false });
    render(<SidebarNav />);

    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Sign up")).toBeInTheDocument();
    expect(screen.queryByText("Certificates")).not.toBeInTheDocument();
  });
});

describe("SidebarNav: logged in", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ user: USER, loading: false });
  });

  it("highlights the link matching the current path", () => {
    render(<SidebarNav />);
    const dashboardLink = screen.getByText("Dashboard").closest("a")!;
    const catalogLink = screen.getByText("Catalog").closest("a")!;

    expect(dashboardLink.className).toContain("bg-primary-500");
    expect(catalogLink.className).not.toContain("bg-primary-500");
  });

  it("shows the user's first name next to their avatar", () => {
    render(<SidebarNav />);
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });

  it("toggles the user menu open and closed", async () => {
    const user = userEvent.setup();
    render(<SidebarNav />);

    expect(screen.queryByText("jane@rvskills.com")).not.toBeInTheDocument();

    await user.click(screen.getByText("Jane"));
    expect(screen.getByText("jane@rvskills.com")).toBeInTheDocument();

    await user.click(screen.getByText("Jane"));
    expect(screen.queryByText("jane@rvskills.com")).not.toBeInTheDocument();
  });

  it("logs out and redirects to /login when Log out is clicked", async () => {
    const user = userEvent.setup();
    mockLogout.mockResolvedValue(undefined);
    render(<SidebarNav />);

    await user.click(screen.getByText("Jane"));
    await user.click(screen.getByText("Log out"));

    expect(mockLogout).toHaveBeenCalled();
    expect(window.location.href).toBe("/login");
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminSidebarNav } from "../admin-sidebar-nav";
import { useSession } from "@/lib/user-session";
import { usePathname } from "next/navigation";

vi.mock("@/lib/user-session", () => ({ useSession: vi.fn(), logout: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

const mockUseSession = vi.mocked(useSession);
const mockUsePathname = vi.mocked(usePathname);

const USER = {
  user_id: "a-1",
  first_name: "Admin",
  last_name: "User",
  email: "admin@rvskills.com",
  username: "admin",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePathname.mockReturnValue("/admin/users");
});

describe("AdminSidebarNav", () => {
  it("always shows the admin nav links, even while the session is loading", () => {
    mockUseSession.mockReturnValue({ user: null, loading: true });
    render(<AdminSidebarNav />);

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Courses")).toBeInTheDocument();
  });

  it("highlights the link matching the current path", () => {
    mockUseSession.mockReturnValue({ user: null, loading: true });
    render(<AdminSidebarNav />);

    const usersLink = screen.getByText("Users").closest("a")!;
    const coursesLink = screen.getByText("Courses").closest("a")!;
    expect(usersLink.className).toContain("bg-primary-500");
    expect(coursesLink.className).not.toContain("bg-primary-500");
  });

  it("shows the user menu only once loaded and a user is present", () => {
    mockUseSession.mockReturnValue({ user: null, loading: true });
    const { rerender } = render(<AdminSidebarNav />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();

    mockUseSession.mockReturnValue({ user: USER, loading: false });
    rerender(<AdminSidebarNav />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("toggles the user menu open on click", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({ user: USER, loading: false });
    render(<AdminSidebarNav />);

    await user.click(screen.getByText("Admin"));
    expect(screen.getByText("admin@rvskills.com")).toBeInTheDocument();
  });
});

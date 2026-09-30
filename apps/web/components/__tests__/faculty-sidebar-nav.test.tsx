// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FacultySidebarNav } from "../faculty-sidebar-nav";
import { useSession } from "@/lib/user-session";
import { usePathname } from "next/navigation";

vi.mock("@/lib/user-session", () => ({ useSession: vi.fn(), logout: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

const mockUseSession = vi.mocked(useSession);
const mockUsePathname = vi.mocked(usePathname);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSession.mockReturnValue({ user: null, loading: true });
});

describe("FacultySidebarNav", () => {
  it("highlights My Courses when on the faculty home path", () => {
    mockUsePathname.mockReturnValue("/faculty");
    render(<FacultySidebarNav />);

    const link = screen.getByText("My Courses").closest("a")!;
    expect(link.className).toContain("bg-primary-500");
  });

  it("does not highlight My Courses on a different path", () => {
    mockUsePathname.mockReturnValue("/faculty/courses/course-1");
    render(<FacultySidebarNav />);

    const link = screen.getByText("My Courses").closest("a")!;
    expect(link.className).not.toContain("bg-primary-500");
  });
});

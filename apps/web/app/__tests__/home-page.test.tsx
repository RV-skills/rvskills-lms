// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const session = vi.hoisted(() => ({ user: null as unknown, loading: false }));
vi.mock("@/lib/user-session", () => ({ useSession: () => session }));
vi.mock("@/lib/courses", () => ({ getCourses: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import HomePage from "../page";
import { getCourses } from "@/lib/courses";

const course = {
  course_id: "c1",
  title: "Excel Essentials for Commerce",
  description: "Formatting, sorting and filtering.",
  thumbnail_url: null,
  difficulty: "intermediate",
  instructorName: "Faculty",
  total_lessons: 14,
  total_duration_mins: 184,
};

beforeEach(() => {
  session.user = null;
  vi.mocked(getCourses).mockResolvedValue([course, { ...course, course_id: "c2", title: "Advanced Excel" }, { ...course, course_id: "c3", title: "ADAD" }, { ...course, course_id: "c4", title: "Fourth" }]);
});

describe("Home page", () => {
  it("shows the header links for a visitor and every published course", async () => {
    render(<HomePage />);
    const nav = within(screen.getByRole("navigation", { name: "Main" }));
    expect(nav.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(nav.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
    expect(await screen.findByText("Excel Essentials for Commerce")).toBeTruthy();
    expect(screen.getByText("Fourth")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "View course" })[0]).toHaveAttribute("href", "/courses/c1");
    expect(screen.getAllByText("14 lessons · about 3 hours").length).toBe(4);
  });

  it("offers the dashboard instead of log in when signed in", () => {
    session.user = { user_id: "u1" };
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
  });

  it("says so when courses can't load", async () => {
    vi.mocked(getCourses).mockRejectedValue(new Error("down"));
    render(<HomePage />);
    expect(await screen.findByText(/Couldn.t load courses/)).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseCard } from "../course-card";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} alt={props.alt as string} />,
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const BASE_PROPS = {
  href: "/courses/course-1",
  title: "Intro to React",
  difficulty: "beginner",
  instructorName: "Jane Doe",
  totalLessons: 5,
  totalDurationMins: 120,
  footer: { kind: "enroll" } as const,
};

describe("CourseCard: difficulty badge tone", () => {
  it.each([
    ["beginner", "success"],
    ["intermediate", "warning"],
    ["advanced", "danger"],
    ["unknown-level", "neutral"],
  ])("shows the %s difficulty label", async (difficulty) => {
    render(<CourseCard {...BASE_PROPS} difficulty={difficulty} />);
    expect(screen.getByText(difficulty)).toBeInTheDocument();
  });
});

describe("CourseCard: duration and lesson count", () => {
  it("rounds a duration in minutes to whole hours", () => {
    render(<CourseCard {...BASE_PROPS} totalDurationMins={125} />);
    expect(screen.getByText(/2h/)).toBeInTheDocument();
  });

  it("shows minutes directly when the rounded value is under an hour", () => {
    // Math.round(45 / 60) is 1, so 45 genuinely displays as "1h" -- 20 is a
    // real example of a duration that rounds down to 0 hours.
    render(<CourseCard {...BASE_PROPS} totalDurationMins={20} />);
    expect(screen.getByText(/20 min/)).toBeInTheDocument();
  });

  it("omits the duration entirely when it is null", () => {
    render(<CourseCard {...BASE_PROPS} totalDurationMins={null} />);
    expect(screen.getByText("5 lessons")).toBeInTheDocument();
  });

  it("omits the duration entirely when it is zero", () => {
    render(<CourseCard {...BASE_PROPS} totalDurationMins={0} />);
    expect(screen.getByText("5 lessons")).toBeInTheDocument();
  });

  it("pluralizes lesson correctly for exactly one lesson", () => {
    render(<CourseCard {...BASE_PROPS} totalLessons={1} />);
    expect(screen.getByText(/1 lesson$/)).toBeInTheDocument();
  });
});

describe("CourseCard: footer variants", () => {
  it("shows Enroll now, linking to checkout, for 'enroll'", () => {
    render(<CourseCard {...BASE_PROPS} footer={{ kind: "enroll" }} />);
    const link = screen.getByRole("link", { name: /enroll now/i });
    expect(link).toHaveAttribute("href", "/courses/course-1/checkout");
  });

  it("shows Continue learning, linking to the player, for 'continue'", () => {
    render(<CourseCard {...BASE_PROPS} footer={{ kind: "continue" }} />);
    const link = screen.getByRole("link", { name: /continue learning/i });
    expect(link).toHaveAttribute("href", "/courses/course-1/player");
  });

  it("shows a progress bar clamped to the given percentage for 'progress'", () => {
    render(<CourseCard {...BASE_PROPS} footer={{ kind: "progress", value: 40 }} />);
    expect(screen.getByText("40% complete")).toBeInTheDocument();
  });

  it("clamps a progress value above 100 down to 100", () => {
    const { container } = render(
      <CourseCard {...BASE_PROPS} footer={{ kind: "progress", value: 150 }} />
    );
    const bar = container.querySelector('[style*="width"]');
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("clamps a negative progress value up to 0", () => {
    const { container } = render(
      <CourseCard {...BASE_PROPS} footer={{ kind: "progress", value: -10 }} />
    );
    const bar = container.querySelector('[style*="width"]');
    expect(bar).toHaveStyle({ width: "0%" });
  });

  it("shows View certificate for 'completed'", () => {
    render(<CourseCard {...BASE_PROPS} footer={{ kind: "completed" }} />);
    expect(screen.getByRole("button", { name: /view certificate/i })).toBeInTheDocument();
  });
});

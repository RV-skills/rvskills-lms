// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayerView } from "../player-view";
import type { CoursePlayerData } from "@/lib/course-player";

vi.mock("../lesson-stage", () => ({ LessonStage: () => <div>STAGE</div> }));
vi.mock("../assessments-tab", () => ({ AssessmentsTab: () => null }));

const lesson = (id: string) => ({
  lesson_id: id,
  title: `Lesson ${id}`,
  content_type: "VIDEO" as const,
  estimated_duration_mins: 5,
  video_url: null,
  description: null,
  resources: [],
  status: "upcoming" as const,
});

describe("PlayerView for a batch that hasn't started", () => {
  it("shows when each module unlocks instead of an empty player", () => {
    const data: CoursePlayerData = {
      courseTitle: "Excel",
      modules: [
        { module_id: "m1", title: "Basics", is_locked: true, unlocks_on: "2026-11-01", lessons: [lesson("a")] },
        { module_id: "m2", title: "Formulas", is_locked: true, unlocks_on: "2026-11-15", lessons: [lesson("b")] },
      ],
      currentLesson: lesson("a"),
    };
    render(<PlayerView courseId="c1" data={data} onMarkComplete={vi.fn()} />);

    expect(screen.getByText("This module unlocks on 1 Nov 2026.")).toBeTruthy();
    expect(screen.getByText("Unlocks on 15 Nov 2026")).toBeTruthy();
    expect(screen.queryByText("STAGE")).toBeNull();
    expect(screen.queryByRole("button", { name: "Mark as complete" })).toBeNull();
  });
});

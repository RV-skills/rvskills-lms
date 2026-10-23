// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleManager } from "../schedule-manager";
import * as batches from "@/lib/batches";

vi.mock("@/lib/batches", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/batches")>();
  return {
    ...real,
    getCourseSchedule: vi.fn(),
    setModuleOffset: vi.fn().mockResolvedValue(undefined),
    createBatch: vi.fn().mockResolvedValue(undefined),
    setBatchModuleDate: vi.fn().mockResolvedValue(undefined),
    clearBatchModuleDate: vi.fn().mockResolvedValue(undefined),
    setStudentBatch: vi.fn().mockResolvedValue(undefined),
    todayInIndia: () => "2026-11-10",
  };
});

const schedule: batches.CourseSchedule = {
  course_id: "c1",
  courseTitle: "PU Commerce Excel",
  modules: [
    { module_id: "m1", title: "Basics", unlock_after_days: 0 },
    { module_id: "m2", title: "Formulas", unlock_after_days: 14 },
  ],
  batches: [
    {
      batch_id: "b1",
      course_id: "c1",
      name: "Nov 2026",
      start_date: "2026-11-01",
      end_date: null,
      student_count: 1,
      modules: [
        { module_id: "m1", unlock_date: "2026-11-01", overridden: false, is_open: true },
        { module_id: "m2", unlock_date: "2026-11-20", overridden: true, is_open: false },
      ],
    },
  ],
  students: [
    { enrollment_id: "e1", student_id: "s1", name: "Asha Rao", username: "asha", batch_id: null, enrolled_at: "" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(batches.getCourseSchedule).mockResolvedValue(schedule);
});

describe("ScheduleManager", () => {
  it("saves only the module days that changed", async () => {
    render(<ScheduleManager courseId="c1" />);
    const days = await screen.findByLabelText("Opens on day, Formulas");
    fireEvent.change(days, { target: { value: "21" } });
    await userEvent.click(screen.getByText("Save schedule"));
    expect(batches.setModuleOffset).toHaveBeenCalledTimes(1);
    expect(batches.setModuleOffset).toHaveBeenCalledWith("c1", "m2", 21);
  });

  it("unlocks a locked module today, and can go back to the course schedule", async () => {
    render(<ScheduleManager courseId="c1" />);
    await userEvent.click(await screen.findByText("Unlock now"));
    expect(batches.setBatchModuleDate).toHaveBeenCalledWith("c1", "b1", "m2", "2026-11-10");
    await userEvent.click(screen.getByText("Use schedule"));
    expect(batches.clearBatchModuleDate).toHaveBeenCalledWith("c1", "b1", "m2");
  });

  it("adds a batch and moves a student into it", async () => {
    render(<ScheduleManager courseId="c1" />);
    await userEvent.type(await screen.findByPlaceholderText("e.g. Nov 2026"), "Mar 2027");
    const section = screen.getByText("Add batch").closest("div")!;
    const [start] = within(section).getAllByDisplayValue("");
    await userEvent.type(start, "2027-03-01");
    await userEvent.click(screen.getByText("Add batch"));
    expect(batches.createBatch).toHaveBeenCalledWith("c1", { name: "Mar 2027", start_date: "2027-03-01", end_date: null });

    await userEvent.selectOptions(screen.getByLabelText("Batch for Asha Rao"), "b1");
    expect(batches.setStudentBatch).toHaveBeenCalledWith("c1", "e1", "b1");
  });
});

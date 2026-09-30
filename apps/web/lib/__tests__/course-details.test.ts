import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCourseDetail, moduleDurationMins, type ModuleDetail } from "../course-details";
import { gatewayFetch, GatewayError } from "../gateway-client";

vi.mock("../gateway-client", async () => {
  const actual = await vi.importActual<typeof import("../gateway-client")>("../gateway-client");
  return { ...actual, gatewayFetch: vi.fn() };
});
const mockFetch = vi.mocked(gatewayFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCourseDetail", () => {
  it("returns the course on success", async () => {
    mockFetch.mockResolvedValue({ course_id: "course-1" } as never);
    await expect(getCourseDetail("course-1")).resolves.toEqual({ course_id: "course-1" });
  });

  it("returns null for a real 404", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Not found", 404));
    await expect(getCourseDetail("missing")).resolves.toBeNull();
  });

  it("rethrows any other error", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Forbidden", 403));
    await expect(getCourseDetail("course-1")).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("moduleDurationMins", () => {
  function fakeModule(lessons: { estimated_duration_mins: number | null }[]): ModuleDetail {
    return {
      module_id: "mod-1",
      title: "Module 1",
      is_locked: false,
      lessons: lessons.map((l, i) => ({
        lesson_id: `l-${i}`,
        title: `Lesson ${i}`,
        is_preview: false,
        estimated_duration_mins: l.estimated_duration_mins,
      })),
    };
  }

  it("sums the known durations", () => {
    const mod = fakeModule([{ estimated_duration_mins: 10 }, { estimated_duration_mins: 15 }]);
    expect(moduleDurationMins(mod)).toBe(25);
  });

  it("ignores lessons with an unknown duration", () => {
    const mod = fakeModule([{ estimated_duration_mins: 10 }, { estimated_duration_mins: null }]);
    expect(moduleDurationMins(mod)).toBe(10);
  });

  it("returns null when no lesson has a known duration", () => {
    const mod = fakeModule([{ estimated_duration_mins: null }, { estimated_duration_mins: null }]);
    expect(moduleDurationMins(mod)).toBeNull();
  });

  it("returns null for a module with no lessons at all", () => {
    const mod = fakeModule([]);
    expect(moduleDurationMins(mod)).toBeNull();
  });
});
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCourses } from "../courses";
import { gatewayFetch } from "../gateway-client";

vi.mock("../gateway-client", () => ({ gatewayFetch: vi.fn() }));
const mockFetch = vi.mocked(gatewayFetch);

const ALL_COURSES = [
  { course_id: "1", title: "Intro to React", difficulty: "beginner" },
  { course_id: "2", title: "Advanced Systems", difficulty: "advanced" },
  { course_id: "3", title: "React Native Basics", difficulty: "intermediate" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(ALL_COURSES as never);
});

describe("getCourses", () => {
  it("returns everything when no filters are given", async () => {
    await expect(getCourses()).resolves.toHaveLength(3);
  });

  it("filters by title, case-insensitively", async () => {
    const result = await getCourses({ search: "REACT" });
    expect(result.map((c) => c.course_id)).toEqual(["1", "3"]);
  });

  it("trims whitespace from the search term before matching", async () => {
    const result = await getCourses({ search: "  react  " });
    expect(result).toHaveLength(2);
  });

  it("treats a blank/whitespace-only search as no filter at all", async () => {
    const result = await getCourses({ search: "   " });
    expect(result).toHaveLength(3);
  });

  it("filters by exact difficulty match", async () => {
    const result = await getCourses({ difficulty: "advanced" });
    expect(result.map((c) => c.course_id)).toEqual(["2"]);
  });

  it("combines search and difficulty filters", async () => {
    const result = await getCourses({ search: "react", difficulty: "intermediate" });
    expect(result.map((c) => c.course_id)).toEqual(["3"]);
  });
});
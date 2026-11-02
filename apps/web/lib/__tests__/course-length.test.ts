import { describe, expect, it } from "vitest";
import { formatCourseLength } from "../course-length";

describe("formatCourseLength", () => {
  it("rounds to the nearest half hour", () => {
    expect(formatCourseLength(14, 184)).toBe("14 lessons · about 3 hours");
    expect(formatCourseLength(14, 282)).toBe("14 lessons · about 4.5 hours");
    expect(formatCourseLength(3, 70)).toBe("3 lessons · about 1 hour");
  });

  it("shows minutes under an hour, and only lessons when there is no duration", () => {
    expect(formatCourseLength(1, 25)).toBe("1 lesson · 25 min");
    expect(formatCourseLength(3, null)).toBe("3 lessons");
    expect(formatCourseLength(3, 0)).toBe("3 lessons");
  });
});

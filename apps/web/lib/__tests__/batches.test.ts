import { describe, expect, it } from "vitest";
import { formatDay, todayInIndia } from "../batches";

describe("batch date helpers", () => {
  it("uses India's date, which runs 5h30 ahead of UTC", () => {
    expect(todayInIndia(new Date("2026-11-14T18:29:00Z"))).toBe("2026-11-14");
    expect(todayInIndia(new Date("2026-11-14T18:30:00Z"))).toBe("2026-11-15");
  });

  it("shows a day the same way wherever the browser is", () => {
    expect(formatDay("2026-11-15")).toBe("15 Nov 2026");
  });
});

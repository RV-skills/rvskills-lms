import { describe, expect, it } from "vitest";
import { addDays, isOpen, moduleUnlockDate } from "../release-schedule";

describe("release schedule", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-01", 14)).toBe("2026-11-15");
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("opens at midnight India time", () => {
    expect(isOpen("2026-11-15", new Date("2026-11-14T18:29:59Z"))).toBe(false);
    expect(isOpen("2026-11-15", new Date("2026-11-14T18:30:00Z"))).toBe(true);
  });

  it("counts from the batch start, or uses the batch's own date", () => {
    const batch = { start_date: "2027-03-01", module_dates: [{ module_id: "m-3", unlock_date: "2027-04-20" }] };
    expect(moduleUnlockDate(batch, "m-2", 14)).toEqual({ date: "2027-03-15", overridden: false });
    expect(moduleUnlockDate(batch, "m-3", 35)).toEqual({ date: "2027-04-20", overridden: true });
  });
});

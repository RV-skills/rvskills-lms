import { describe, expect, it } from "vitest";
import { CreateBatchSchema, UpdateBatchSchema } from "../batch.validator";

describe("batch validators", () => {
  it("accepts a batch with or without an end date", () => {
    expect(CreateBatchSchema.safeParse({ name: "Nov 2026", start_date: "2026-11-01" }).success).toBe(true);
    expect(
      CreateBatchSchema.safeParse({ name: "Nov 2026", start_date: "2026-11-01", end_date: "2027-05-31" }).success
    ).toBe(true);
  });

  it("rejects impossible dates and an end before the start", () => {
    expect(CreateBatchSchema.safeParse({ name: "x", start_date: "2026-02-30" }).success).toBe(false);
    expect(CreateBatchSchema.safeParse({ name: "x", start_date: "1/11/2026" }).success).toBe(false);
    expect(
      CreateBatchSchema.safeParse({ name: "x", start_date: "2026-11-01", end_date: "2026-10-01" }).success
    ).toBe(false);
  });

  it("needs something to update", () => {
    expect(UpdateBatchSchema.safeParse({}).success).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { resolveBillRate } from "./bill-rates";
import type { BillRate } from "./types";

function rate(overrides: Partial<BillRate>): BillRate {
  return {
    id: "id",
    user_id: "user-1",
    work_type_id: "wt-1",
    job_id: null,
    rate: 0,
    ...overrides,
  };
}

describe("resolveBillRate", () => {
  it("returns null when no rates exist", () => {
    expect(resolveBillRate([], "user-1", "wt-1", null)).toBeNull();
  });

  it("returns the default rate when no job override exists", () => {
    const rates = [rate({ id: "default", rate: 50 })];
    expect(resolveBillRate(rates, "user-1", "wt-1", "job-1")).toBe(50);
  });

  it("falls back to the default when an override exists for a different job", () => {
    const rates = [
      rate({ id: "default", rate: 50 }),
      rate({ id: "override", job_id: "job-2", rate: 75 }),
    ];
    expect(resolveBillRate(rates, "user-1", "wt-1", "job-1")).toBe(50);
  });

  it("prefers the job override when it matches", () => {
    const rates = [
      rate({ id: "default", rate: 50 }),
      rate({ id: "override", job_id: "job-1", rate: 75 }),
    ];
    expect(resolveBillRate(rates, "user-1", "wt-1", "job-1")).toBe(75);
  });

  it("doesn't cross-contaminate between employees or work types", () => {
    const rates = [
      rate({ id: "a", user_id: "user-1", work_type_id: "wt-1", rate: 50 }),
      rate({ id: "b", user_id: "user-2", work_type_id: "wt-1", rate: 60 }),
      rate({ id: "c", user_id: "user-1", work_type_id: "wt-2", rate: 70 }),
    ];
    expect(resolveBillRate(rates, "user-1", "wt-1", null)).toBe(50);
    expect(resolveBillRate(rates, "user-2", "wt-1", null)).toBe(60);
    expect(resolveBillRate(rates, "user-1", "wt-2", null)).toBe(70);
    expect(resolveBillRate(rates, "user-2", "wt-2", null)).toBeNull();
  });
});

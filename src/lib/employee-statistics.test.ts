import { describe, it, expect } from "vitest";
import { bucketRegularOvertime } from "./employee-statistics";

describe("bucketRegularOvertime", () => {
  it("treats a single week under 40 hours as all regular", () => {
    const { regular, overtime } = bucketRegularOvertime(new Map([["2026-08-24", 32]]));
    expect(regular).toBe(32);
    expect(overtime).toBe(0);
  });

  it("splits a single week over 40 hours into regular + overtime", () => {
    const { regular, overtime } = bucketRegularOvertime(new Map([["2026-08-24", 45]]));
    expect(regular).toBe(40);
    expect(overtime).toBe(5);
  });

  it("sums regular and overtime independently across multiple weeks", () => {
    const weeks = new Map([
      ["2026-08-24", 45], // 40 regular + 5 OT
      ["2026-08-31", 30], // 30 regular
      ["2026-09-07", 50], // 40 regular + 10 OT
    ]);
    const { regular, overtime } = bucketRegularOvertime(weeks);
    expect(regular).toBe(110);
    expect(overtime).toBe(15);
  });

  it("returns zero for both when there are no weeks", () => {
    expect(bucketRegularOvertime(new Map())).toEqual({ regular: 0, overtime: 0 });
  });
});

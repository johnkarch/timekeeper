import { describe, it, expect } from "vitest";
import { resolveBillRate } from "./bill-rates";
import type { BillRate } from "./types";

function rate(overrides: Partial<BillRate>): BillRate {
  return { id: "id", user_id: "user-1", rate: 0, ...overrides };
}

describe("resolveBillRate", () => {
  it("returns null when no rates exist", () => {
    expect(resolveBillRate([], "user-1")).toBeNull();
  });

  it("returns the employee's rate when one is set", () => {
    const rates = [rate({ rate: 50 })];
    expect(resolveBillRate(rates, "user-1")).toBe(50);
  });

  it("doesn't cross-contaminate between employees", () => {
    const rates = [
      rate({ id: "a", user_id: "user-1", rate: 50 }),
      rate({ id: "b", user_id: "user-2", rate: 60 }),
    ];
    expect(resolveBillRate(rates, "user-1")).toBe(50);
    expect(resolveBillRate(rates, "user-2")).toBe(60);
    expect(resolveBillRate(rates, "user-3")).toBeNull();
  });
});

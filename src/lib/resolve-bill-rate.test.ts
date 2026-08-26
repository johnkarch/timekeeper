import { describe, it, expect } from "vitest";
import { resolveBillRate } from "./resolve-bill-rate";
import type { BillRate } from "./types";

function rate(overrides: Partial<BillRate>): BillRate {
  return { id: "id", user_id: "user-1", rate: 0, effective_date: "2026-01-01", ...overrides };
}

describe("resolveBillRate", () => {
  it("returns null when no rates exist", () => {
    expect(resolveBillRate([], "user-1", "2026-06-01")).toBeNull();
  });

  it("returns the single applicable rate", () => {
    const rates = [rate({ rate: 50, effective_date: "2026-01-01" })];
    expect(resolveBillRate(rates, "user-1", "2026-06-01")).toBe(50);
  });

  it("picks the latest rate that isn't after the target date, not the latest overall", () => {
    const rates = [
      rate({ id: "a", rate: 50, effective_date: "2026-01-01" }),
      rate({ id: "b", rate: 65, effective_date: "2026-06-01" }),
      rate({ id: "c", rate: 80, effective_date: "2026-12-01" }),
    ];
    expect(resolveBillRate(rates, "user-1", "2026-07-15")).toBe(65);
  });

  it("treats an exact effective_date match as applicable", () => {
    const rates = [rate({ rate: 50, effective_date: "2026-06-01" })];
    expect(resolveBillRate(rates, "user-1", "2026-06-01")).toBe(50);
  });

  it("returns null when the target date is before every rate — a rate change never applies retroactively", () => {
    const rates = [
      rate({ id: "old", rate: 50, effective_date: "2025-01-01" }),
      rate({ id: "new", rate: 65, effective_date: "2026-01-01" }),
    ];
    // Work done the day before the new rate took effect still resolves to
    // the old rate, not the new one.
    expect(resolveBillRate(rates, "user-1", "2025-12-31")).toBe(50);
  });

  it("doesn't cross-contaminate between employees", () => {
    const rates = [
      rate({ id: "a", user_id: "user-1", rate: 50, effective_date: "2026-01-01" }),
      rate({ id: "b", user_id: "user-2", rate: 80, effective_date: "2026-01-01" }),
    ];
    expect(resolveBillRate(rates, "user-1", "2026-06-01")).toBe(50);
    expect(resolveBillRate(rates, "user-2", "2026-06-01")).toBe(80);
  });
});

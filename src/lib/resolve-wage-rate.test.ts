import { describe, it, expect } from "vitest";
import { resolveWageRate } from "./resolve-wage-rate";
import type { WageRate } from "./types";

function rate(overrides: Partial<WageRate>): WageRate {
  return { id: "id", user_id: "user-1", hourly_rate: 0, effective_date: "2026-01-01", ...overrides };
}

describe("resolveWageRate", () => {
  it("returns null when no rates exist", () => {
    expect(resolveWageRate([], "user-1", "2026-06-01")).toBeNull();
  });

  it("returns the single applicable rate", () => {
    const rates = [rate({ hourly_rate: 20, effective_date: "2026-01-01" })];
    expect(resolveWageRate(rates, "user-1", "2026-06-01")).toBe(20);
  });

  it("picks the latest rate that isn't after the target date, not the latest overall", () => {
    const rates = [
      rate({ id: "a", hourly_rate: 20, effective_date: "2026-01-01" }),
      rate({ id: "b", hourly_rate: 25, effective_date: "2026-06-01" }),
      rate({ id: "c", hourly_rate: 30, effective_date: "2026-12-01" }),
    ];
    expect(resolveWageRate(rates, "user-1", "2026-07-15")).toBe(25);
  });

  it("treats an exact effective_date match as applicable", () => {
    const rates = [rate({ hourly_rate: 20, effective_date: "2026-06-01" })];
    expect(resolveWageRate(rates, "user-1", "2026-06-01")).toBe(20);
  });

  it("returns null when the target date is before every rate", () => {
    const rates = [rate({ hourly_rate: 20, effective_date: "2026-06-01" })];
    expect(resolveWageRate(rates, "user-1", "2026-01-01")).toBeNull();
  });

  it("doesn't cross-contaminate between employees", () => {
    const rates = [
      rate({ id: "a", user_id: "user-1", hourly_rate: 20, effective_date: "2026-01-01" }),
      rate({ id: "b", user_id: "user-2", hourly_rate: 40, effective_date: "2026-01-01" }),
    ];
    expect(resolveWageRate(rates, "user-1", "2026-06-01")).toBe(20);
    expect(resolveWageRate(rates, "user-2", "2026-06-01")).toBe(40);
  });
});

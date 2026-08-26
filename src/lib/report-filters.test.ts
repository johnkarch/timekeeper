import { describe, it, expect } from "vitest";
import { resolveDetailFilters } from "./report-filters";
import { addMonths, currentMonth, firstOfMonth } from "./dates";
import type { CurrentUser } from "./auth";

function admin(): CurrentUser {
  return { user: { id: "admin-1" } as CurrentUser["user"], role: "admin", fullName: "Admin" };
}
function employee(): CurrentUser {
  return { user: { id: "emp-1" } as CurrentUser["user"], role: "employee", fullName: "Employee" };
}

describe("resolveDetailFilters", () => {
  it("defaults to the current month when no start/end is given", () => {
    const filters = resolveDetailFilters({}, admin());
    expect(filters.start).toBe(firstOfMonth(currentMonth()));
    expect(filters.end).toBe(firstOfMonth(addMonths(currentMonth(), 1)));
  });

  it("converts a raw `end` param (inclusive) to an exclusive bound", () => {
    const filters = resolveDetailFilters({ start: "2026-08-01", end: "2026-08-31" }, admin());
    expect(filters.start).toBe("2026-08-01");
    expect(filters.end).toBe("2026-09-01");
  });

  it("passes through a billed/unbilled filter, ignoring anything else", () => {
    expect(resolveDetailFilters({ billed: "billed" }, admin()).billed).toBe("billed");
    expect(resolveDetailFilters({ billed: "unbilled" }, admin()).billed).toBe("unbilled");
    expect(resolveDetailFilters({ billed: "bogus" }, admin()).billed).toBeUndefined();
    expect(resolveDetailFilters({}, admin()).billed).toBeUndefined();
  });

  it("lets an admin filter by one or more employee/job ids", () => {
    const single = resolveDetailFilters({ employee_id: "u1", job_id: "j1" }, admin());
    expect(single.userIds).toEqual(["u1"]);
    expect(single.jobIds).toEqual(["j1"]);

    const multiple = resolveDetailFilters(
      { employee_id: ["u1", "u2"], job_id: ["j1", "j2"] },
      admin()
    );
    expect(multiple.userIds).toEqual(["u1", "u2"]);
    expect(multiple.jobIds).toEqual(["j1", "j2"]);
  });

  it("leaves userIds undefined for an admin with no employee filter (no restriction)", () => {
    expect(resolveDetailFilters({}, admin()).userIds).toBeUndefined();
  });

  it("force-locks a non-admin to themselves regardless of any employee_id param", () => {
    const filters = resolveDetailFilters({ employee_id: ["someone-else", "another"] }, employee());
    expect(filters.userIds).toEqual(["emp-1"]);
  });

  it("still lets a non-admin filter by job", () => {
    const filters = resolveDetailFilters({ job_id: "j1" }, employee());
    expect(filters.jobIds).toEqual(["j1"]);
  });
});

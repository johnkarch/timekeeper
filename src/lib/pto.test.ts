import { describe, it, expect } from "vitest";
import { PTO_JOB_PATTERN } from "./pto";

describe("PTO_JOB_PATTERN", () => {
  it.each([
    "100002 PTO",
    "100003 Vacation",
    "100004 Holiday",
    "pto",
    "VACATION",
    "Company Holiday - Thanksgiving",
  ])("matches %s", (jobName) => {
    expect(PTO_JOB_PATTERN.test(jobName)).toBe(true);
  });

  it.each(["100005 Kitchen Remodel", "100006 - 2010 Packer Drive", ""])(
    "doesn't match %s",
    (jobName) => {
      expect(PTO_JOB_PATTERN.test(jobName)).toBe(false);
    }
  );
});

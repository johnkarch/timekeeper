import { describe, it, expect } from "vitest";
import { isValidJobName } from "./job-format";

describe("isValidJobName", () => {
  it("accepts a 6-digit number followed by a space and free text", () => {
    expect(isValidJobName("100001 KAIN - Modern Escape")).toBe(true);
  });

  it("accepts a 6-digit number followed directly by a dash", () => {
    expect(isValidJobName("122000 - 2010 Packer Drive - Green Bay")).toBe(true);
  });

  it("accepts a bare 6-digit number with nothing after it", () => {
    expect(isValidJobName("100001")).toBe(true);
  });

  it("rejects fewer than 6 digits", () => {
    expect(isValidJobName("10001 Test Job")).toBe(false);
  });

  it("rejects text that doesn't start with digits", () => {
    expect(isValidJobName("Test Job 100001")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidJobName("")).toBe(false);
  });

  it("rejects a 7th digit run directly after the number (no separator)", () => {
    // Guards against a typo like "1000012" being silently accepted as
    // starting with the valid 6-digit number "100001".
    expect(isValidJobName("1000012345")).toBe(false);
  });

  it("accepts a 6-digit number immediately followed by a letter", () => {
    expect(isValidJobName("120000SKIFF Log Cabin")).toBe(true);
  });
});

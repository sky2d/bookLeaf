import { describe, expect, it } from "vitest";
import { EMPTY, formatAge, formatCount, formatDate, formatINR } from "./format";

describe("format", () => {
  it("formats rupees in the Indian grouping", () => {
    expect(formatINR(57744)).toBe("₹57,744");
    expect(formatINR(123456)).toBe("₹1,23,456");
    expect(formatINR(0)).toBe("₹0");
  });

  it("renders missing values as an em dash", () => {
    expect(formatINR(null)).toBe(EMPTY);
    expect(formatINR(Number.NaN)).toBe(EMPTY);
    expect(formatCount(undefined)).toBe(EMPTY);
    expect(formatDate(null)).toBe(EMPTY);
    expect(formatDate("not-a-date")).toBe(EMPTY);
  });

  it("formats calendar dates without timezone drift", () => {
    expect(formatDate("2023-06-20")).toBe("20 Jun 2023");
  });

  it("formats ages compactly", () => {
    const now = Date.parse("2026-10-23T12:00:00Z");
    expect(formatAge("2026-10-23T11:15:00Z", now)).toBe("45m");
    expect(formatAge("2026-10-23T06:00:00Z", now)).toBe("6h");
    expect(formatAge("2026-10-20T08:00:00Z", now)).toBe("3d 4h");
    expect(formatAge("2026-10-21T12:00:00Z", now)).toBe("2d");
  });
});

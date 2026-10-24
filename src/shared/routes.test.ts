import { describe, expect, it } from "vitest";
import { safeNextPath } from "./routes";

describe("safeNextPath", () => {
  it("keeps same-site paths with their query string", () => {
    expect(safeNextPath("/author/tickets?tab=open")).toBe("/author/tickets?tab=open");
  });

  it("rejects anything that would leave the site", () => {
    for (const next of ["//evil.com", "/\\evil.com", "/\\/evil.com", "https://evil.com", "javascript:alert(1)"]) {
      expect(safeNextPath(next)).toBe("/");
    }
  });

  it("falls back to / for missing or repeated params", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(["/a", "/b"])).toBe("/");
  });
});

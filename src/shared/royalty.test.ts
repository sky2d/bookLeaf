import { describe, expect, it } from "vitest";
import { isBelowPayoutThreshold, nextPayout, quarterEndOf } from "./royalty";
import { productionInfo } from "./production";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

describe("quarterEndOf", () => {
  it.each([
    ["2026-01-01", "2026-03-31"],
    ["2026-05-15", "2026-06-30"],
    ["2026-09-30", "2026-09-30"],
    ["2026-12-31", "2026-12-31"],
  ])("%s → %s", (input, expected) => expect(iso(quarterEndOf(d(input)))).toBe(expected));
});

describe("nextPayout", () => {
  it("is the previous quarter's payout while its 45-day window is open", () => {
    const p = nextPayout(d("2026-10-23"));
    expect(iso(p.quarterEnd)).toBe("2026-09-30");
    expect(iso(p.payoutBy)).toBe("2026-11-14");
    expect(p.quarterLabel).toBe("Jul–Sep 2026");
  });

  it("includes the last day of the window", () => {
    expect(iso(nextPayout(d("2026-11-14")).payoutBy)).toBe("2026-11-14");
  });

  it("moves to the current quarter once the window has closed", () => {
    const p = nextPayout(d("2026-11-15"));
    expect(iso(p.quarterEnd)).toBe("2026-12-31");
    expect(iso(p.payoutBy)).toBe("2027-02-14");
    expect(p.quarterLabel).toBe("Oct–Dec 2026");
  });

  it("handles the year boundary (Q4 paid in February)", () => {
    const p = nextPayout(d("2027-01-10"));
    expect(iso(p.quarterEnd)).toBe("2026-12-31");
    expect(iso(p.payoutBy)).toBe("2027-02-14");
  });
});

describe("isBelowPayoutThreshold", () => {
  it.each([
    [0, false],
    [850, true],
    [999, true],
    [1000, false],
    [2546, false],
  ])("₹%i → %s", (pending, expected) => expect(isBelowPayoutThreshold(pending)).toBe(expected));
});

describe("productionInfo", () => {
  it("recognises published books", () => {
    expect(productionInfo("Published & Live")).toEqual({ published: true, stage: "Published & Live", stageIndex: 8 });
  });
  it("parses in-production stages from the dataset", () => {
    expect(productionInfo("In Production - Cover Design")).toEqual({ published: false, stage: "Cover Design", stageIndex: 2 });
    expect(productionInfo("In Production - Typesetting").stageIndex).toBe(3);
  });
  it("tolerates unknown stages", () => {
    expect(productionInfo("In Production - Marketing").stageIndex).toBe(-1);
  });
});

import { describe, expect, it } from "vitest";
import {
  assembleTicketFacts,
  getFormattedNextPayout,
  getProductionStageFact,
  getRoyaltyStatusFact,
} from "./facts";

describe("facts.getFormattedNextPayout", () => {
  it("computes next payout date accurately on quarter boundaries", () => {
    // 2026-10-24 is in Q4, but Q3 window (Jul-Sep) ends on Nov 14 (within 45 days)
    const oct = new Date("2026-10-24T10:00:00.000Z");
    const payoutOct = getFormattedNextPayout(oct);
    expect(payoutOct.quarterLabel).toBe("Jul–Sep 2026");
    expect(payoutOct.payoutBy).toBe("14 Nov 2026");

    // 2026-12-01 is past the Q3 payout window, so next is Q4 payout (due Feb 14, 2027)
    const dec = new Date("2026-12-01T10:00:00.000Z");
    const payoutDec = getFormattedNextPayout(dec);
    expect(payoutDec.quarterLabel).toBe("Oct–Dec 2026");
    expect(payoutDec.payoutBy).toBe("14 Feb 2027");
  });
});

describe("facts.getRoyaltyStatusFact", () => {
  const testDate = new Date("2026-10-24T10:00:00.000Z");

  it("handles ₹0 pending balance correctly", () => {
    const fact = getRoyaltyStatusFact(0, 5000, 5000, testDate);
    expect(fact).toContain("Royalty balance is ₹0");
    expect(fact).toContain("All royalties are settled");
  });

  it("identifies balances below ₹1,000 threshold and notes rollover", () => {
    const fact = getRoyaltyStatusFact(850, 4850, 4000, testDate);
    expect(fact).toContain("Pending royalty is ₹850");
    expect(fact).toContain("below the ₹1,000 minimum threshold");
    expect(fact).toContain("rolls over to the next quarter");
    expect(fact).toContain("14 Nov 2026");
  });

  it("identifies eligible balances >= ₹1,000 and notes scheduled disbursement", () => {
    const fact = getRoyaltyStatusFact(2546, 2546, 0, testDate);
    expect(fact).toContain("Pending royalty is ₹2,546");
    expect(fact).toContain("exceeds ₹1,000 threshold");
    expect(fact).toContain("Scheduled for disbursement");
    expect(fact).toContain("14 Nov 2026");
  });
});

describe("facts.getProductionStageFact", () => {
  it("formats Published & Live status", () => {
    const fact = getProductionStageFact("Published & Live");
    expect(fact).toBe("Status: Published & Live. The title is fully published and actively in print.");
  });

  it("formats in-production stage with full pipeline context", () => {
    const fact = getProductionStageFact("In Production - Cover Design");
    expect(fact).toContain("Status: In Production (Cover Design, stage 3 of 9:");
    expect(fact).toContain("Manuscript Received → Editing → Cover Design");
  });

  it("handles unrecognised status safely", () => {
    const fact = getProductionStageFact("Archived");
    expect(fact).toBe("Status: Archived.");
  });
});

describe("facts.assembleTicketFacts", () => {
  it("formats complete ticket context with referenced book facts", () => {
    const facts = assembleTicketFacts({
      author: {
        name: "Priya Sharma",
        email: "priya.sharma@email.com",
      },
      book: {
        title: "Whispers of the Ganges",
        isbn: "978-81-951234-0-1",
        status: "Published & Live",
        mrp: 399,
        copiesSold: 120,
        royaltyEarned: 4800,
        royaltyPaid: 4000,
        royaltyPending: 800,
        lastPayoutDate: "2026-08-15",
        printPartner: "Repro India",
        availableOn: ["Amazon", "Flipkart"],
      },
      today: new Date("2026-10-24T10:00:00.000Z"),
    });

    expect(facts).toContain("### Ground-Truth Facts (DO NOT Contradict or Invent)");
    expect(facts).toContain("- Author Name: Priya Sharma");
    expect(facts).toContain('- Book Title: "Whispers of the Ganges"');
    expect(facts).toContain("- ISBN: 978-81-951234-0-1");
    expect(facts).toContain("Status: Published & Live");
    expect(facts).toContain("₹800");
    expect(facts).toContain("Print Partner: Repro India");
    expect(facts).toContain("Retail Availability: Amazon, Flipkart");
  });

  it("formats general query when book is null", () => {
    const facts = assembleTicketFacts({
      author: {
        name: "Rahul Verma",
        email: "rahul@email.com",
      },
      book: null,
    });

    expect(facts).toContain("- Author Name: Rahul Verma");
    expect(facts).toContain("- Referenced Book: None (General / Account-level query)");
  });
});

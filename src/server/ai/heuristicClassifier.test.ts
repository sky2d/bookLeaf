import { describe, expect, it } from "vitest";
import { classifyWithHeuristics } from "./heuristicClassifier";

describe("heuristicClassifier", () => {
  it("classifies royalty query with pending balance above threshold as HIGH priority", () => {
    const result = classifyWithHeuristics({
      subject: "Royalty not received for 6 months",
      description: "My book has been selling well but I haven't received my royalty payment yet.",
      book: {
        royaltyPending: 2500,
        royaltyEarned: 5000,
        royaltyPaid: 2500,
      },
    });

    expect(result.category).toBe("ROYALTY_PAYMENTS");
    expect(result.priority).toBe("HIGH");
    expect(result.confidence).toBe(0.75);
    expect(result.reasoning).toContain("unpaid royalty inquiry exceeding payout threshold");
  });

  it("classifies ISBN mismatch as ISBN_METADATA with HIGH priority", () => {
    const result = classifyWithHeuristics({
      subject: "Wrong ISBN on Amazon",
      description: "There is an ISBN mismatch on the product page and sales are blocked.",
    });

    expect(result.category).toBe("ISBN_METADATA");
    expect(result.priority).toBe("HIGH");
    expect(result.reasoning).toContain("ISBN");
  });

  it("classifies printing defects as PRINTING_QUALITY", () => {
    const result = classifyWithHeuristics({
      subject: "Author copy arrived with broken binding",
      description: "The misprint has torn pages and defective binding.",
    });

    expect(result.category).toBe("PRINTING_QUALITY");
    expect(result.priority).toBe("MEDIUM");
  });

  it("classifies out of stock retailer issues as DISTRIBUTION_AVAILABILITY", () => {
    const result = classifyWithHeuristics({
      subject: "Book showing out of stock on Flipkart",
      description: "Customers are complaining that the buy link says currently unavailable.",
    });

    expect(result.category).toBe("DISTRIBUTION_AVAILABILITY");
    expect(result.priority).toBe("MEDIUM");
  });

  it("classifies production progress inquiries as BOOK_STATUS_PRODUCTION", () => {
    const result = classifyWithHeuristics({
      subject: "Status of my book cover design",
      description: "When will my book move from manuscript editing to proof approval?",
    });

    expect(result.category).toBe("BOOK_STATUS_PRODUCTION");
    expect(result.priority).toBe("MEDIUM");
  });

  it("classifies author bio and compliments as LOW priority", () => {
    const result = classifyWithHeuristics({
      subject: "Update my author bio",
      description: "I want to change the short bio and profile photo on my author dashboard. Thank you!",
    });

    expect(result.priority).toBe("LOW");
  });

  it("escalates legal or consumer court threats to CRITICAL priority", () => {
    const result = classifyWithHeuristics({
      subject: "Unacceptable delay - taking legal action",
      description: "I am consulting my lawyer to file a case in consumer court for fraud and breach of contract.",
    });

    expect(result.priority).toBe("CRITICAL");
    expect(result.reasoning).toContain("legal escalation");
  });

  it("falls back to GENERAL_INQUIRY with LOW priority for generic questions", () => {
    const result = classifyWithHeuristics({
      subject: "Hello BookLeaf team",
      description: "I am thinking about writing a new book in the future and wanted to say hi.",
    });

    expect(result.category).toBe("GENERAL_INQUIRY");
    expect(result.priority).toBe("LOW");
  });
});

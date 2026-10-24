import { describe, expect, it } from "vitest";
import {
  DISTRIBUTION_POLICY,
  getContextFor,
  ISBN_POLICY,
  OVERVIEW_POLICY,
  PRINTING_POLICY,
  PRODUCTION_POLICY,
  ROYALTY_POLICY,
  TONE_AND_STYLE,
} from "./knowledgeBase";

describe("knowledgeBase.getContextFor", () => {
  it("includes tone and style guidelines in every category context", () => {
    const royaltyContext = getContextFor("ROYALTY_PAYMENTS");
    const generalContext = getContextFor("GENERAL_INQUIRY");
    const nullContext = getContextFor(null);

    expect(royaltyContext).toContain("Tone & Style Guidelines");
    expect(generalContext).toContain("Tone & Style Guidelines");
    expect(nullContext).toContain("Tone & Style Guidelines");
  });

  it("returns royalty policy and sample QA for ROYALTY_PAYMENTS without leaking unrelated sections", () => {
    const context = getContextFor("ROYALTY_PAYMENTS");

    expect(context).toContain("Royalty & Payments Policy");
    expect(context).toContain("₹1,000");
    expect(context).toContain("45 days");
    expect(context).toContain("sales dashboard shows ₹850");

    // Must NOT leak other policies
    expect(context).not.toContain("ISBN & Metadata Policy");
    expect(context).not.toContain("Printing & Quality Assurance Policy");
    expect(context).not.toContain("Distribution & Availability Policy");
    expect(context).not.toContain("Book Production Pipeline");
  });

  it("returns ISBN policy for ISBN_METADATA without leaking other policies", () => {
    const context = getContextFor("ISBN_METADATA");

    expect(context).toContain("ISBN & Metadata Policy");
    expect(context).toContain("48 hours");
    expect(context).not.toContain("Royalty & Payments Policy");
    expect(context).not.toContain("Print Partners");
  });

  it("returns printing policy for PRINTING_QUALITY", () => {
    const context = getContextFor("PRINTING_QUALITY");

    expect(context).toContain("Printing & Quality Assurance Policy");
    expect(context).toContain("Repro India");
    expect(context).toContain("5–7 business days");
    expect(context).not.toContain("Royalty & Payments Policy");
  });

  it("returns distribution policy for DISTRIBUTION_AVAILABILITY", () => {
    const context = getContextFor("DISTRIBUTION_AVAILABILITY");

    expect(context).toContain("Distribution & Availability Policy");
    expect(context).toContain("BookLeaf Bookstore, Amazon India, and Flipkart");
    expect(context).not.toContain("Editing");
  });

  it("returns production pipeline policy for BOOK_STATUS_PRODUCTION", () => {
    const context = getContextFor("BOOK_STATUS_PRODUCTION");

    expect(context).toContain("Book Production Pipeline");
    expect(context).toContain("Manuscript Received");
    expect(context).toContain("Typesetting");
    expect(context).not.toContain("₹1,000");
  });

  it("returns overview and general policy when category is GENERAL_INQUIRY or null", () => {
    const generalContext = getContextFor("GENERAL_INQUIRY");
    const nullContext = getContextFor(null);

    expect(generalContext).toContain("BookLeaf Publishing Overview");
    expect(generalContext).toContain("General Inquiries & Account Services");
    expect(nullContext).toContain("BookLeaf Publishing Overview");
    expect(nullContext).toContain("General Inquiries & Account Services");
  });
});

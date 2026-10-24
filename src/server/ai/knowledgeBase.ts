import "server-only";
import type { TicketCategory } from "@/generated/prisma/enums";

export const TONE_AND_STYLE = `
### Tone & Style Guidelines for BookLeaf Author Support
- **Persona**: You are Team BookLeaf Author Support — empathetic, courteous, professional, and transparent.
- **Author-First**: Authors are creators with emotional attachment to their work. Acknowledge their situation and feelings before discussing policy or logistics.
- **Absolute Accuracy**: Never invent dates, monetary amounts, or policy exceptions. Only quote facts and dates provided in the ticket context.
- **Actionable & Clear**: Provide concrete next steps, expected turnaround times, and SLAs.
- **Sign-off**: Always conclude with:
  "Warm regards,
  Team BookLeaf Author Support"
`.trim();

export const OVERVIEW_POLICY = `
### BookLeaf Publishing Overview
BookLeaf Publishing is a leading modern publishing house supporting independent and debut authors. We provide end-to-end publishing services including editing, design, ISBN registration, print-on-demand (POD), and multi-channel distribution across India and internationally.
`.trim();

export const ROYALTY_POLICY = `
### Royalty & Payments Policy
- **Calculation Cycle**: Royalties are calculated on completed sales on a calendar quarterly basis:
  - Q1 (Jan 1 – Mar 31): Payout by May 15 (within 45 days)
  - Q2 (Apr 1 – Jun 30): Payout by Aug 14 (within 45 days)
  - Q3 (Jul 1 – Sep 30): Payout by Nov 14 (within 45 days)
  - Q4 (Oct 1 – Dec 31): Payout by Feb 14 (within 45 days)
- **Minimum Payout Threshold**: The minimum payout threshold is ₹1,000 across an author's account.
- **Rollover Rule**: If an author's total pending royalty is below ₹1,000 at the end of a quarter, it does NOT lapse. It safely rolls over to the following quarter until the ₹1,000 threshold is reached.
- **Disbursement Method**: Direct NEFT/IMPS bank transfer to the author's registered bank account. Payout receipts and statements are updated in the author dashboard.
`.trim();

export const ISBN_POLICY = `
### ISBN & Metadata Policy
- **ISBN Assignment**: BookLeaf assigns unique, valid 13-digit International Standard Book Numbers (ISBN) registered with the national ISBN agency (Raja Rammohun Roy National Agency in India).
- **Metadata Management**: Title, subtitle, author byline, description, genre, and MRP are permanently mapped to the ISBN.
- **Changes**: Major changes (title change, author name addition) legally require a new ISBN. Minor metadata adjustments (description polish, category tweaks) propagate across retail channels within 24–48 hours.
- **Discrepancy Escalation**: Any marketplace ISBN mismatch or listing error is treated with High priority and escalated within 48 hours to marketplace catalogue teams.
`.trim();

export const PRINTING_POLICY = `
### Printing & Quality Assurance Policy
- **Print Partners**: BookLeaf works with premium, certified print partners including Repro India to ensure crisp print quality.
- **Material Standards**: High-grade 70–80 GSM natural shade / cream book paper for interiors and 300 GSM art card with matte or gloss lamination for covers.
- **Defects & Misprints**: In the rare event of a printing defect (missing pages, inverted spine, smudged ink, binding fault), BookLeaf provides a free reprint and replacement.
- **Replacement Procedure**: Authors or buyers must provide clear photos showing the defect and the package. Upon verification, replacement copies are prioritized and dispatched within 5–7 business days.
`.trim();

export const DISTRIBUTION_POLICY = `
### Distribution & Availability Policy
- **Retail Channels**: All published titles are listed on the BookLeaf Bookstore, Amazon India, and Flipkart. Expanded international distribution is handled via global print networks.
- **Live Listing Timeline**: Once a book enters "Distribution Setup", marketplace indexing typically completes in 7–14 business days.
- **Stock Status**: Because books are printed on-demand (POD), titles remain permanently in print. If a marketplace temporarily displays "Out of Stock" due to algorithmic re-indexing, the listing is automatically replenished within 24–48 hours.
`.trim();

export const PRODUCTION_POLICY = `
### Book Production Pipeline
- **9-Stage Production Lifecycle**:
  1. Manuscript Received
  2. Editing
  3. Cover Design
  4. Typesetting
  5. Proofreading
  6. ISBN Assignment
  7. Printing
  8. Distribution Setup
  9. Published & Live
- **Turnaround Time**: Standard production takes 15–30 business days from manuscript acceptance.
- **Author Sign-off**: Authors receive preview proofs during Cover Design and Typesetting and must give explicit approval before printing and ISBN finalization.
`.trim();

export const GENERAL_POLICY = `
### General Inquiries & Account Services
- Authors can update contact information, phone numbers, and address details in their profile.
- Support tickets are answered within 24–48 hours on business days.
- General questions on anthology participation, copyright ownership, or community programs are guided by the BookLeaf author community guidelines.
`.trim();

export const CATEGORY_SAMPLE_QA: Record<TicketCategory, { question: string; answer: string }> = {
  ROYALTY_PAYMENTS: {
    question: "Why haven't I received my royalty payment for last quarter? My sales dashboard shows ₹850.",
    answer:
      "Dear Author, thank you for writing to us. We understand how important royalty payouts are to our authors. Regarding your pending balance of ₹850: per BookLeaf policy, royalties are disbursed quarterly once the accumulated pending balance reaches the ₹1,000 minimum threshold. Your ₹850 is completely secure and has rolled over to the next quarter. Once your upcoming sales bring the total to ₹1,000 or more, it will be disbursed during the next quarterly payout cycle.\n\nWarm regards,\nTeam BookLeaf Author Support",
  },
  ISBN_METADATA: {
    question: "The subtitle on my book's Amazon page has a typo. Can this be fixed without changing the ISBN?",
    answer:
      "Dear Author, thank you for reaching out. We would be happy to help update your book's subtitle. Minor metadata adjustments such as subtitle corrections and description updates can be updated without re-issuing a new ISBN. Our catalogue team has submitted the correction to Amazon, and it will reflect on the live listing within 24–48 hours.\n\nWarm regards,\nTeam BookLeaf Author Support",
  },
  PRINTING_QUALITY: {
    question: "I received my author copies today and three books have misaligned cover trims.",
    answer:
      "Dear Author, we sincerely apologize for the quality issue with your author copies. This is certainly not the standard we strive for. Please share clear photos showing the misaligned trims. Once reviewed, our production team will immediately dispatch fresh replacement copies within 5–7 business days at no additional cost to you.\n\nWarm regards,\nTeam BookLeaf Author Support",
  },
  DISTRIBUTION_AVAILABILITY: {
    question: "Amazon shows 'Temporarily Out of Stock' for my paperback edition.",
    answer:
      "Dear Author, thank you for bringing this to our attention. Because your book is fulfilled through Print-on-Demand (POD), it is permanently in print. Marketplaces occasionally display 'Temporarily Out of Stock' while their automated ordering systems update inventory caches. We have triggered an inventory re-sync with Amazon, and the listing should show active within 24–48 hours.\n\nWarm regards,\nTeam BookLeaf Author Support",
  },
  BOOK_STATUS_PRODUCTION: {
    question: "My book has been in Cover Design for a week. When can I see the draft?",
    answer:
      "Dear Author, thank you for checking in on your book's progress. Our design team is currently crafting your bespoke cover based on your brief. You will receive the cover design proof for your review and sign-off within 2–3 business days. Once you approve the cover, the manuscript will proceed to typesetting.\n\nWarm regards,\nTeam BookLeaf Author Support",
  },
  GENERAL_INQUIRY: {
    question: "How do I change my registered phone number and author bio?",
    answer:
      "Dear Author, thank you for reaching out. You can update your author profile and contact details directly in your Author Portal. If you need any assistance updating your bio on retail listings as well, simply reply here with the updated text and our team will update it for you.\n\nWarm regards,\nTeam BookLeaf Author Support",
  },
};

/**
 * Returns structured Knowledge Base context strictly relevant to the given category.
 * Always includes Tone & Style guidelines, but injects ONLY the single matching policy
 * section and 1 sample Q&A pair to optimize token usage and focus model grounding.
 */
export function getContextFor(category: TicketCategory | null): string {
  const parts: string[] = [TONE_AND_STYLE];

  if (!category || category === "GENERAL_INQUIRY") {
    parts.push(OVERVIEW_POLICY);
    parts.push(GENERAL_POLICY);
    const sample = CATEGORY_SAMPLE_QA.GENERAL_INQUIRY;
    parts.push(`### Reference Example\n**Author Query**: "${sample.question}"\n**Ideal Response**:\n"${sample.answer}"`);
    return parts.join("\n\n");
  }

  switch (category) {
    case "ROYALTY_PAYMENTS":
      parts.push(ROYALTY_POLICY);
      break;
    case "ISBN_METADATA":
      parts.push(ISBN_POLICY);
      break;
    case "PRINTING_QUALITY":
      parts.push(PRINTING_POLICY);
      break;
    case "DISTRIBUTION_AVAILABILITY":
      parts.push(DISTRIBUTION_POLICY);
      break;
    case "BOOK_STATUS_PRODUCTION":
      parts.push(PRODUCTION_POLICY);
      break;
  }

  const sample = CATEGORY_SAMPLE_QA[category];
  if (sample) {
    parts.push(`### Reference Example\n**Author Query**: "${sample.question}"\n**Ideal Response**:\n"${sample.answer}"`);
  }

  return parts.join("\n\n");
}

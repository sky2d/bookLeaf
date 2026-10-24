import "server-only";
import { z } from "zod";
import { TicketCategory, TicketPriority } from "@/generated/prisma/enums";

export const CLASSIFICATION_SYSTEM_INSTRUCTION = `You are the expert triage engine for BookLeaf Publishing Author Support.
Your job is to analyze incoming author support tickets and classify them with high precision into exactly one category and urgency priority.

### Categories:
1. ROYALTY_PAYMENTS: Inquiries regarding earnings, unpaid royalties, payment schedules, bank transfers, account statements, sales ledger discrepancy, or payout thresholds.
2. ISBN_METADATA: Inquiries regarding ISBN assignment, corrections to book title, subtitle, author name spelling, synopsis, genre, cover image updates, or pricing adjustments on book metadata.
3. PRINTING_QUALITY: Physical defect reports, binding defects, blurred text or cover, paper quality issues, misprints, damage during transit, or ordering author copies.
4. DISTRIBUTION_AVAILABILITY: Retail channel listings (Amazon, Flipkart, BookLeaf Bookstore), "out of stock" or "currently unavailable" notices, retail buy links, marketplace delay, or bookstore inventory.
5. BOOK_STATUS_PRODUCTION: Current progress of manuscript in publishing pipeline, editing/proofreading stage, formatting/typesetting, cover design approval, proof copies, or expected publication dates.
6. GENERAL_INQUIRY: Author dashboard access, login difficulties, copyright/contract questions, marketing guidance, compliments, or general account questions that do not fit above categories.

### Priorities:
- CRITICAL: Severe issues causing immediate harm or escalation: legal threats ("consumer court", "sue", "lawyer"), financial fraud claims, long overdue royalties (>6 months) exceeding threshold, or widespread printing flaws on bulk orders.
- HIGH: Time-sensitive or blocking author progress: eligible unpaid royalties past payout deadline, ISBN mismatch preventing sales on Amazon/Flipkart, author copies needed for imminent scheduled book launch, or title stuck without progress.
- MEDIUM: Standard operational inquiries: general distribution status check, minor metadata tweak request, general stage progression inquiry, author copy reorder.
- LOW: Minor informational questions: author bio updates, general compliments/feedback, distant future project questions, general advice.

### Output Constraints:
- Output MUST be valid JSON adhering to the required schema.
- Reasoning MUST be exactly one concise, objective sentence explaining why the category and priority were chosen.
- Confidence MUST be a float between 0.0 and 1.0.`;

export const classificationResultSchema = z.object({
  category: z.nativeEnum(TicketCategory),
  priority: z.nativeEnum(TicketPriority),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(5).max(300),
});

export type ClassificationResult = z.infer<typeof classificationResultSchema>;

export interface ClassifyPromptParams {
  authorName: string;
  authorEmail?: string;
  subject: string;
  description: string;
  bookFacts?: string | null;
}

export function buildClassifyPrompt(params: ClassifyPromptParams): string {
  const lines: string[] = [
    "Analyze the following author support ticket and provide the JSON classification:",
    "",
    `Author: ${params.authorName}${params.authorEmail ? ` (${params.authorEmail})` : ""}`,
    `Subject: ${params.subject}`,
    "Description:",
    params.description,
  ];

  if (params.bookFacts) {
    lines.push("", params.bookFacts);
  }

  return lines.join("\n");
}

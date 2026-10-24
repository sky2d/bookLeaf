import "server-only";
import { TicketCategory, TicketPriority } from "@/generated/prisma/enums";
import type { ClassificationResult } from "./prompts/classify";
import { PAYOUT_THRESHOLD_INR } from "@/shared/royalty";

export interface HeuristicClassifyParams {
  subject: string;
  description: string;
  book?: {
    title?: string;
    status?: string;
    royaltyPending?: number;
    royaltyEarned?: number;
    royaltyPaid?: number;
  } | null;
}

const CATEGORY_RULES: Array<{
  category: TicketCategory;
  patterns: RegExp[];
}> = [
  {
    category: "ROYALTY_PAYMENTS",
    patterns: [
      /\b(royalt|payout|payment|earning|bank transfer|remittance|unpaid balance|sales ledger|disbursement|commission)\b/i,
      /\b(where is my money|not received.*money|haven'?t.*paid)\b/i,
    ],
  },
  {
    category: "ISBN_METADATA",
    patterns: [
      /\b(isbn|barcode|metadata)\b/i,
      /\b(typo in title|author name spelling|spelling error|change title|subtitle typo|genre change|book synopsis)\b/i,
      /\b(wrong author|wrong title|cover typo)\b/i,
    ],
  },
  {
    category: "PRINTING_QUALITY",
    patterns: [
      /\b(misprint|damaged copy|broken binding|binding issue|torn|smudge|blurry text|cover blur|paper quality)\b/i,
      /\b(author cop(y|ies)|print defect|missing pages?|defective print|spine defect)\b/i,
    ],
  },
  {
    category: "DISTRIBUTION_AVAILABILITY",
    patterns: [
      /\b(amazon|flipkart|bookstore|listing|buy link|buy button|retailer|retail availability)\b/i,
      /\b(out of stock|currently unavailable|not available on amazon|not showing on flipkart)\b/i,
    ],
  },
  {
    category: "BOOK_STATUS_PRODUCTION",
    patterns: [
      /\b(status of (my )?book|production stage|manuscript|proofreading|editing stage|cover design stage)\b/i,
      /\b(when will (my )?book (be )?publish|formatting stage|typeset|proof approval|illustration)\b/i,
    ],
  },
];

const CRITICAL_PATTERNS = [
  /\b(legal action|lawyer|sue|court|consumer forum|police|fraud|scam|cheated)\b/i,
  /\b(breach of contract|police complaint)\b/i,
];

const HIGH_PATTERNS = [
  /\b(urgent|immediately|asap|overdue|delayed for months|launch date|book launch|event tomorrow)\b/i,
  /\b(wrong isbn|mismatch|blocked|cannot sell|not received for (several|\d+) months)\b/i,
];

const LOW_PATTERNS = [
  /\b(author bio|bio update|about the author|photo change|profile photo|just curious)\b/i,
  /\b(thank you|thanks|appreciation|kudos|great job|congratulations|feedback)\b/i,
];

/**
 * Deterministic keyword-based triage engine used when Gemini AI is disabled,
 * times out, or encounters unexpected failures.
 */
export function classifyWithHeuristics(params: HeuristicClassifyParams): ClassificationResult {
  const text = `${params.subject} \n ${params.description}`;

  // 1. Determine Category
  let category: TicketCategory = "GENERAL_INQUIRY";
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      category = rule.category;
      break;
    }
  }

  // 2. Determine Priority
  let priority: TicketPriority = "MEDIUM";
  let matchedReason = "standard inquiry pattern";

  if (CRITICAL_PATTERNS.some((pattern) => pattern.test(text))) {
    priority = "CRITICAL";
    matchedReason = "detected legal escalation or severe complaint terminology";
  } else if (
    category === "ROYALTY_PAYMENTS" &&
    params.book?.royaltyPending &&
    params.book.royaltyPending >= PAYOUT_THRESHOLD_INR &&
    /not received|delay|overdue|months/i.test(text)
  ) {
    priority = "HIGH";
    matchedReason = "unpaid royalty inquiry exceeding payout threshold";
  } else if (HIGH_PATTERNS.some((pattern) => pattern.test(text))) {
    priority = "HIGH";
    matchedReason = "detected time-sensitive or blocking issue keywords";
  } else if (LOW_PATTERNS.some((pattern) => pattern.test(text))) {
    priority = "LOW";
    matchedReason = "minor metadata/bio update or general courtesy inquiry";
  } else {
    // Default priority based on category
    if (category === "ISBN_METADATA") {
      priority = "MEDIUM";
    } else if (category === "GENERAL_INQUIRY") {
      priority = "LOW";
      matchedReason = "general inquiry without urgency markers";
    }
  }

  const reasoning = `Heuristic fallback: Classified as ${category} (${priority} priority) based on ${matchedReason}.`;

  return {
    category,
    priority,
    confidence: 0.75,
    reasoning,
  };
}

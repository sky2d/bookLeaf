import "server-only";
import { getToday } from "@/server/clock";
import { formatDate, formatINR } from "@/lib/format";
import { PRODUCTION_STAGES, productionInfo } from "@/shared/production";
import { isBelowPayoutThreshold, nextPayout, PAYOUT_THRESHOLD_INR } from "@/shared/royalty";

export type NextPayoutInfo = {
  payoutBy: string;
  quarterLabel: string;
};

/** Returns formatted ground-truth payout information as of `today` */
export function getFormattedNextPayout(today?: Date): NextPayoutInfo {
  const currentDate = today ?? getToday();
  const window = nextPayout(currentDate);

  return {
    payoutBy: formatDate(window.payoutBy),
    quarterLabel: window.quarterLabel,
  };
}

/** Evaluates ground-truth royalty facts according to BookLeaf policy */
export function getRoyaltyStatusFact(
  pending: number,
  earned: number,
  paid: number,
  today?: Date,
): string {
  const payoutInfo = getFormattedNextPayout(today);

  if (pending <= 0) {
    return `Royalty balance is ₹0 (total earned: ${formatINR(earned)}, total paid: ${formatINR(paid)}). All royalties are settled.`;
  }

  if (isBelowPayoutThreshold(pending)) {
    return `Pending royalty is ${formatINR(pending)} (total earned: ${formatINR(earned)}, paid: ${formatINR(paid)}). Because this is below the ${formatINR(PAYOUT_THRESHOLD_INR)} minimum threshold, it rolls over to the next quarter. Next scheduled payout date for eligible accounts is ${payoutInfo.payoutBy} (${payoutInfo.quarterLabel}).`;
  }

  return `Pending royalty is ${formatINR(pending)} (exceeds ${formatINR(PAYOUT_THRESHOLD_INR)} threshold). Scheduled for disbursement on or before ${payoutInfo.payoutBy} covering ${payoutInfo.quarterLabel} sales.`;
}

/** Evaluates production stage facts */
export function getProductionStageFact(status: string): string {
  const info = productionInfo(status);

  if (info.published) {
    return "Status: Published & Live. The title is fully published and actively in print.";
  }

  if (info.stageIndex >= 0) {
    return `Status: In Production (${info.stage}, stage ${info.stageIndex + 1} of ${PRODUCTION_STAGES.length}: ${PRODUCTION_STAGES.join(" → ")}).`;
  }

  return `Status: ${status}.`;
}

export type TicketFactContext = {
  author: {
    name: string;
    email: string;
  };
  book?: {
    title: string;
    isbn: string;
    status: string;
    mrp: number | null;
    copiesSold: number;
    royaltyEarned: number;
    royaltyPaid: number;
    royaltyPending: number;
    lastPayoutDate: string | null;
    printPartner: string | null;
    availableOn: string[];
  } | null;
  today?: Date;
};

/**
 * Compiles an unambiguous, ground-truth facts block to inject into prompts.
 * The model must strictly adhere to these facts and never invent amounts or dates.
 */
export function assembleTicketFacts(context: TicketFactContext): string {
  const lines: string[] = [
    "### Ground-Truth Facts (DO NOT Contradict or Invent)",
    `- Author Name: ${context.author.name}`,
    `- Author Email: ${context.author.email}`,
  ];

  if (!context.book) {
    lines.push("- Referenced Book: None (General / Account-level query)");
    return lines.join("\n");
  }

  const b = context.book;
  lines.push(`- Book Title: "${b.title}"`);
  lines.push(`- ISBN: ${b.isbn || "Not assigned yet"}`);
  lines.push(`- ${getProductionStageFact(b.status)}`);
  lines.push(`- Copies Sold: ${b.copiesSold}`);
  lines.push(`- MRP: ${b.mrp ? formatINR(b.mrp) : "Not finalized"}`);
  lines.push(
    `- Royalty Summary: ${getRoyaltyStatusFact(b.royaltyPending, b.royaltyEarned, b.royaltyPaid, context.today)}`,
  );
  if (b.lastPayoutDate) {
    lines.push(`- Last Payout Recorded: ${b.lastPayoutDate}`);
  }
  if (b.printPartner) {
    lines.push(`- Print Partner: ${b.printPartner}`);
  }
  if (b.availableOn.length > 0) {
    lines.push(`- Retail Availability: ${b.availableOn.join(", ")}`);
  }

  return lines.join("\n");
}

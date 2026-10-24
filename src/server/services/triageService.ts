import "server-only";
import { AppError } from "@/server/http/AppError";
import { ticketRepo, PRIORITY_RANKS } from "@/server/repositories/ticketRepo";
import { classifyTicket } from "@/server/ai/classifier";
import { classifyWithHeuristics } from "@/server/ai/heuristicClassifier";
import { assembleTicketFacts } from "@/server/ai/facts";
import { isAiEnabled } from "@/server/ai/client";
import { notifyTicketUpdated } from "@/server/realtime/broadcast";
import type { TicketCategory, TicketPriority, TriageSource } from "@/generated/prisma/enums";

export interface TriageResult {
  ticketId: string;
  category: TicketCategory;
  categorySource: TriageSource;
  priority: TicketPriority;
  prioritySource: TriageSource;
  priorityRank: number;
  confidence: number;
  reasoning: string;
}

/**
 * Orchestrates ticket triage.
 * 1. Checks if AI is active and attempts Gemini classification.
 * 2. On failure, timeout, or simulated outage, seamlessly falls back to heuristic rules.
 * 3. Persists category, priority, priorityRank, and reasoning to the database.
 * 4. Broadcasts realtime invalidation to author and admin channels.
 */
export async function triageTicket(ticketId: string): Promise<TriageResult> {
  const ticket = await ticketRepo.findByIdForAdmin(ticketId);
  if (!ticket) {
    throw AppError.notFound("Ticket");
  }

  const bookFacts = ticket.book
    ? assembleTicketFacts({
        author: {
          name: ticket.author.name,
          email: ticket.author.email,
        },
        book: {
          title: ticket.book.title,
          isbn: ticket.book.isbn,
          status: ticket.book.status,
          mrp: ticket.book.mrp,
          copiesSold: ticket.book.copiesSold,
          royaltyEarned: ticket.book.royaltyEarned,
          royaltyPaid: ticket.book.royaltyPaid,
          royaltyPending: ticket.book.royaltyPending,
          lastPayoutDate: ticket.book.lastPayoutDate ? ticket.book.lastPayoutDate.toISOString().slice(0, 10) : null,
          printPartner: ticket.book.printPartner,
          availableOn: ticket.book.availableOn,
        },
      })
    : null;

  let classification: {
    category: TicketCategory;
    priority: TicketPriority;
    confidence: number;
    reasoning: string;
    source: TriageSource;
  };

  if (isAiEnabled()) {
    try {
      const aiResult = await classifyTicket({
        ticketId: ticket.id,
        authorName: ticket.author.name,
        authorEmail: ticket.author.email,
        subject: ticket.subject,
        description: ticket.description,
        bookFacts,
      });

      classification = {
        ...aiResult,
        source: "AI",
      };
    } catch (err) {
      console.warn(
        `[triageService] AI classification failed for ticket ${ticketId}, using heuristic fallback:`,
        err instanceof Error ? err.message : err,
      );

      const fallback = classifyWithHeuristics({
        subject: ticket.subject,
        description: ticket.description,
        book: ticket.book,
      });

      classification = {
        ...fallback,
        source: "FALLBACK",
      };
    }
  } else {
    const fallback = classifyWithHeuristics({
      subject: ticket.subject,
      description: ticket.description,
      book: ticket.book,
    });

    classification = {
      ...fallback,
      source: "FALLBACK",
    };
  }

  const priorityRank = PRIORITY_RANKS[classification.priority];

  await ticketRepo.updateTriage(ticket.id, {
    category: classification.category,
    categorySource: classification.source,
    priority: classification.priority,
    prioritySource: classification.source,
    priorityRank,
    aiConfidence: classification.confidence,
    aiReasoning: classification.reasoning,
  });

  // Broadcast realtime invalidation to author and admin channels
  await notifyTicketUpdated(ticket.id, ticket.authorId, "ticket.updated");

  return {
    ticketId: ticket.id,
    category: classification.category,
    categorySource: classification.source,
    priority: classification.priority,
    prioritySource: classification.source,
    priorityRank,
    confidence: classification.confidence,
    reasoning: classification.reasoning,
  };
}

export const triageService = {
  triageTicket,
};

import "server-only";
import { AppError } from "@/server/http/AppError";
import { ticketRepo } from "@/server/repositories/ticketRepo";
import { getContextFor } from "@/server/ai/knowledgeBase";
import { assembleTicketFacts } from "@/server/ai/facts";
import {
  buildDraftPrompt,
  DRAFT_SYSTEM_INSTRUCTION,
  type DraftPromptMessage,
} from "@/server/ai/prompts/draft";
import type { TicketCategory } from "@/generated/prisma/enums";

export interface DraftContextResult {
  prompt: string;
  systemInstruction: string;
  category: TicketCategory | null;
  messageCount: number;
  ticketId: string;
  authorName: string;
}

/**
 * Builds the complete, targeted prompt context for drafting a reply to a support ticket.
 * - Extracts exactly 1 matching KB section via `getContextFor`.
 * - Injects calculated, non-hallucinated facts for the referenced book.
 * - Collects the initial description and thread messages, capped at the last ≤ 6 messages.
 */
export async function buildDraftContext(ticketId: string): Promise<DraftContextResult> {
  const ticket = await ticketRepo.findByIdForAdmin(ticketId);
  if (!ticket) {
    throw AppError.notFound("Ticket");
  }

  const kbContext = getContextFor(ticket.category);

  const factsBlock = assembleTicketFacts({
    author: {
      name: ticket.author.name,
      email: ticket.author.email,
    },
    book: ticket.book
      ? {
          title: ticket.book.title,
          isbn: ticket.book.isbn,
          status: ticket.book.status,
          mrp: ticket.book.mrp,
          copiesSold: ticket.book.copiesSold,
          royaltyEarned: ticket.book.royaltyEarned,
          royaltyPaid: ticket.book.royaltyPaid,
          royaltyPending: ticket.book.royaltyPending,
          lastPayoutDate: ticket.book.lastPayoutDate
            ? ticket.book.lastPayoutDate.toISOString().slice(0, 10)
            : null,
          printPartner: ticket.book.printPartner,
          availableOn: ticket.book.availableOn,
        }
      : null,
  });

  const initialMessage: DraftPromptMessage = {
    senderRole: "AUTHOR",
    senderName: ticket.author.name,
    body: ticket.description,
    createdAt: ticket.createdAt.toISOString(),
  };

  const followUpMessages: DraftPromptMessage[] = ticket.messages.map((m) => ({
    senderRole: m.senderRole,
    senderName: m.senderRole === "ADMIN" ? "Team BookLeaf" : m.sender.name,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }));

  const allMessages = [initialMessage, ...followUpMessages];
  // Strictly limit context to the last ≤ 6 messages to stay token-efficient
  const recentMessages = allMessages.slice(-6);

  const prompt = buildDraftPrompt({
    authorName: ticket.author.name,
    ticketSubject: ticket.subject,
    kbContext,
    factsBlock,
    messages: recentMessages,
  });

  return {
    prompt,
    systemInstruction: DRAFT_SYSTEM_INSTRUCTION,
    category: ticket.category,
    messageCount: ticket.messages.length,
    ticketId: ticket.id,
    authorName: ticket.author.name,
  };
}

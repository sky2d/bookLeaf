import type { TicketCategory, TicketPriority, TicketStatus, TriageSource } from "@/generated/prisma/enums";

// Response shapes returned by the REST API. Shared by route handlers and the client.
// Dates are ISO strings (calendar dates as YYYY-MM-DD).

export type BookDto = {
  id: string;
  title: string;
  isbn: string;
  genre: string;
  publicationDate: string | null;
  status: string;
  published: boolean;
  /** Current production stage name, e.g. "Cover Design" (equals status for published books). */
  stage: string;
  /** Index into PRODUCTION_STAGES, -1 if unknown. */
  stageIndex: number;
  mrp: number | null;
  royaltyPerCopy: number | null;
  copiesSold: number;
  royaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastPayoutDate: string | null;
  printPartner: string | null;
  availableOn: string[];
};

export type RoyaltySummaryDto = {
  earned: number;
  paid: number;
  pending: number;
  /** True when pending > 0 but under the ₹1,000 minimum, so it rolls over. */
  belowThreshold: boolean;
  nextPayout: { quarterLabel: string; payoutBy: string };
};

export type MyBooksResponse = { books: BookDto[]; summary: RoyaltySummaryDto };

export type TicketSummaryDto = {
  id: string;
  subject: string;
  status: TicketStatus;
  book: { id: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTicketResponse = {
  ticket: TicketSummaryDto;
};

export type MyTicketsResponse = {
  tickets: TicketSummaryDto[];
};

export type TicketMessageDto = {
  id: string;
  senderRole: "AUTHOR" | "ADMIN";
  senderName: string;
  body: string;
  createdAt: string;
};

export type AuthorTicketDto = {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  book: { id: string; title: string } | null;
  messages: TicketMessageDto[];
};

export type AuthorTicketResponse = {
  ticket: AuthorTicketDto;
};

export type CreateMessageResponse = {
  message: TicketMessageDto;
};

export type AdminTicketDto = {
  id: string;
  subject: string;
  status: TicketStatus;
  category: TicketCategory | null;
  categorySource: TriageSource | null;
  priority: TicketPriority | null;
  prioritySource: TriageSource | null;
  priorityRank: number;
  aiConfidence: number | null;
  aiReasoning: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  book: {
    id: string;
    title: string;
  } | null;
  assignee: {
    id: string;
    name: string;
  } | null;
};

export type AdminTicketQueueResponse = {
  tickets: AdminTicketDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

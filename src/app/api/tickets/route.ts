import { parseBody } from "@/server/http/apiHandler";
import { requireAuthorId, withAuth } from "@/server/http/withAuth";
import { ticketService } from "@/server/services/ticketService";
import { createTicketSchema } from "@/shared/schemas/ticket";

/** GET /api/tickets — List all support tickets for the signed-in author. AUTHOR only. */
export const GET = withAuth(
  async (_req, { user }) => {
    const authorId = requireAuthorId(user);
    const tickets = await ticketService.listForAuthor(authorId);
    return Response.json({ tickets });
  },
  { roles: ["AUTHOR"] },
);

/** POST /api/tickets — Create a support ticket. AUTHOR only. */
export const POST = withAuth(
  async (req, { user }) => {
    const authorId = requireAuthorId(user);
    const body = await parseBody(req, createTicketSchema);
    const ticket = await ticketService.create(authorId, body);

    return Response.json(
      { ticket },
      {
        status: 201,
        headers: { Location: `/api/tickets/${ticket.id}` },
      },
    );
  },
  { roles: ["AUTHOR"] },
);

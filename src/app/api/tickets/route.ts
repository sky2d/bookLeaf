import { parseBody } from "@/server/http/apiHandler";
import { requireAuthorId, withAuth } from "@/server/http/withAuth";
import { ticketService } from "@/server/services/ticketService";
import { createTicketSchema } from "@/shared/schemas/ticket";

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

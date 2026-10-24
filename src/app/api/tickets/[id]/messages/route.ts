import { parseBody } from "@/server/http/apiHandler";
import { requireAuthorId, withAuth } from "@/server/http/withAuth";
import { ticketService } from "@/server/services/ticketService";
import { createMessageSchema } from "@/shared/schemas/ticket";

type Params = { id: string };

/** POST /api/tickets/:id/messages — Post a follow-up reply. AUTHOR only. */
export const POST = withAuth<Params>(
  async (req, { user, params }) => {
    const authorId = requireAuthorId(user);
    const body = await parseBody(req, createMessageSchema);
    const message = await ticketService.addAuthorMessage(params.id, authorId, user.id, body);
    return Response.json({ message }, { status: 201 });
  },
  { roles: ["AUTHOR"] },
);

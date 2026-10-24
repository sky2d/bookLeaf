import { requireAuthorId, withAuth } from "@/server/http/withAuth";
import { ticketService } from "@/server/services/ticketService";

type Params = { id: string };

/** GET /api/tickets/:id — View a ticket thread. AUTHOR only. */
export const GET = withAuth<Params>(
  async (_req, { user, params }) => {
    const authorId = requireAuthorId(user);
    const ticket = await ticketService.getForAuthor(params.id, authorId);
    return Response.json({ ticket });
  },
  { roles: ["AUTHOR"] },
);

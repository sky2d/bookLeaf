import { parseBody } from "@/server/http/apiHandler";
import { withAuth } from "@/server/http/withAuth";
import { adminTicketService } from "@/server/services/adminTicketService";
import { createAdminMessageSchema } from "@/shared/schemas/adminTicket";

type Params = { id: string };

/** POST /api/admin/tickets/:id/messages — Send an admin reply. Transitions OPEN to IN_PROGRESS. ADMIN only. */
export const POST = withAuth<Params>(
  async (req, { user, params }) => {
    const body = await parseBody(req, createAdminMessageSchema);
    const result = await adminTicketService.replyToTicket(params.id, user.id, body);
    return Response.json(result, { status: 201 });
  },
  { roles: ["ADMIN"] },
);

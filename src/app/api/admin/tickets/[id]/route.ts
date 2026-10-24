import { parseBody } from "@/server/http/apiHandler";
import { withAuth } from "@/server/http/withAuth";
import { adminTicketService } from "@/server/services/adminTicketService";
import { updateTicketSchema } from "@/shared/schemas/adminTicket";

type Params = { id: string };

/** GET /api/admin/tickets/:id — View full admin ticket detail with author & book context. ADMIN only. */
export const GET = withAuth<Params>(
  async (_req, { params }) => {
    const result = await adminTicketService.getTicketDetail(params.id);
    return Response.json(result);
  },
  { roles: ["ADMIN"] },
);

/** PATCH /api/admin/tickets/:id — Update ticket status, category, priority, or assignee. ADMIN only. */
export const PATCH = withAuth<Params>(
  async (req, { params }) => {
    const body = await parseBody(req, updateTicketSchema);
    const result = await adminTicketService.updateTicket(params.id, body);
    return Response.json(result);
  },
  { roles: ["ADMIN"] },
);

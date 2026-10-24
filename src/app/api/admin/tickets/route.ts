import { parseQuery } from "@/server/http/apiHandler";
import { withAuth } from "@/server/http/withAuth";
import { adminTicketService } from "@/server/services/adminTicketService";
import { ticketQuerySchema } from "@/shared/schemas/ticketQuery";

/** GET /api/admin/tickets — List support tickets queue with filtering, urgency sorting, and pagination. ADMIN only. */
export const GET = withAuth(
  async (req, { user }) => {
    const url = new URL(req.url);
    const query = parseQuery(url, ticketQuerySchema);
    const result = await adminTicketService.listQueue(query, user.id);
    return Response.json(result);
  },
  { roles: ["ADMIN"] },
);

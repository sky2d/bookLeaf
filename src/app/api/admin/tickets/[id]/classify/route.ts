import { withAuth } from "@/server/http/withAuth";
import { triageService } from "@/server/services/triageService";

type Params = { id: string };

/** POST /api/admin/tickets/:id/classify — Re-runs triage on a ticket. ADMIN only. */
export const POST = withAuth<Params>(
  async (_req, { params }) => {
    const triage = await triageService.triageTicket(params.id);
    return Response.json({ triage });
  },
  { roles: ["ADMIN"] },
);

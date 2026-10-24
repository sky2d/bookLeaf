import { parseBody } from "@/server/http/apiHandler";
import { withAuth } from "@/server/http/withAuth";
import { adminTicketService } from "@/server/services/adminTicketService";
import { createInternalNoteSchema } from "@/shared/schemas/adminTicket";

type Params = { id: string };

/** POST /api/admin/tickets/:id/notes — Add a private internal note. ADMIN only. */
export const POST = withAuth<Params>(
  async (req, { user, params }) => {
    const body = await parseBody(req, createInternalNoteSchema);
    const result = await adminTicketService.addNote(params.id, user.id, body);
    return Response.json(result, { status: 201 });
  },
  { roles: ["ADMIN"] },
);

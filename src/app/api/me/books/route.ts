import { bookService } from "@/server/services/bookService";
import { requireAuthorId, withAuth } from "@/server/http/withAuth";

/** GET /api/me/books — the signed-in author's books with a royalty summary. AUTHOR only. */
export const GET = withAuth(
  async (_req, { user }) => Response.json(await bookService.listForAuthor(requireAuthorId(user))),
  { roles: ["AUTHOR"] },
);

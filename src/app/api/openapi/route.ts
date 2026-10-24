import { openApiSpec } from "@/server/openapi";

/**
 * GET /api/openapi — Serves the OpenAPI 3.0.3 specification JSON. Public endpoint.
 */
export async function GET() {
  return Response.json(openApiSpec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

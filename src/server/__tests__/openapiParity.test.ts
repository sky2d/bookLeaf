import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { openApiSpec } from "@/server/openapi";

/** Recursively discovers all route.ts files inside a directory */
function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry === "route.ts") {
      results.push(fullPath);
    }
  }

  return results;
}

/** Converts Next.js route file path to OpenAPI path template (e.g. [id] -> {id}) */
function routeFileToOpenApiPath(filePath: string, apiRootDir: string): string {
  const rel = relative(apiRootDir, filePath).replace(/\\/g, "/");
  const withoutRoute = rel.replace(/\/route\.ts$/, "");
  const openApiPath = `/api/${withoutRoute}`.replace(/\[([^\]]+)\]/g, "{$1}");
  return openApiPath === "/api" ? "/api/" : openApiPath;
}

describe("OpenAPI Spec Parity", () => {
  const apiRootDir = join(process.cwd(), "src", "app", "api");
  const routeFiles = findRouteFiles(apiRootDir);

  it("discovers active API routes", () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(10);
  });

  it("documents every Next.js API route in the OpenAPI specification", () => {
    const documentedPaths = Object.keys(openApiSpec.paths);

    for (const file of routeFiles) {
      // Exclude Auth.js catch-all route [...nextauth] which is handled separately
      if (file.includes("[...nextauth]")) {
        continue;
      }

      const expectedPath = routeFileToOpenApiPath(file, apiRootDir);
      expect(
        documentedPaths,
        `Expected OpenAPI spec to document path: "${expectedPath}" (from ${file})`,
      ).toContain(expectedPath);
    }
  });

  it("ensures all documented endpoints have summaries, operationIds, and valid responses", () => {
    for (const [path, methods] of Object.entries(openApiSpec.paths)) {
      for (const [method, op] of Object.entries(
        methods as Record<string, { summary?: string; operationId?: string; responses?: Record<string, unknown> }>,
      )) {
        expect(op.summary, `Missing summary for ${method.toUpperCase()} ${path}`).toBeDefined();
        expect(op.operationId, `Missing operationId for ${method.toUpperCase()} ${path}`).toBeDefined();
        expect(op.responses, `Missing responses for ${method.toUpperCase()} ${path}`).toBeDefined();
        expect(
          Object.keys(op.responses ?? {}).length,
          `At least one response expected for ${method.toUpperCase()} ${path}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("defines security schemes and standard error models", () => {
    expect(openApiSpec.components.securitySchemes.cookieAuth).toBeDefined();
    expect(openApiSpec.components.schemas.ErrorResponse).toBeDefined();
    expect(openApiSpec.components.schemas.CreateTicketInput).toBeDefined();
    expect(openApiSpec.components.schemas.AdminTicketDetailDto).toBeDefined();
  });
});

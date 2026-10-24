"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";

export default function ApiDocsPage() {
  const [swaggerReady, setSwaggerReady] = useState(false);

  useEffect(() => {
    if (!swaggerReady) return;

    const win = window as unknown as { SwaggerUIBundle?: (config: Record<string, unknown>) => void };
    if (typeof win.SwaggerUIBundle === "function") {
      win.SwaggerUIBundle({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          (win as unknown as { SwaggerUIBundle: { presets: { apis: unknown } } }).SwaggerUIBundle.presets.apis,
        ],
        layout: "BaseLayout",
      });
    }
  }, [swaggerReady]);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <AppHeader
        portal="API Reference"
        nav={[
          { href: "/author/tickets", label: "Author Portal" },
          { href: "/admin/tickets", label: "Admin Queue" },
        ]}
        userName="Developer"
      />

      {/* Header Strip */}
      <div className="border-b border-rule bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📖</span>
              <h1 className="font-serif text-2xl font-bold text-ink">API Documentation</h1>
              <span className="rounded-full bg-cloth/10 px-2.5 py-0.5 text-xs font-semibold text-cloth">
                OpenAPI 3.0
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              Interactive reference for the BookLeaf Author Support Portal REST API. Covers authentication, author endpoints, admin queue operations, and AI services.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/openapi"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
            >
              <span>{`{ }`}</span>
              <span>Raw JSON Spec</span>
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md bg-cloth px-3 py-1.5 text-xs font-medium text-white hover:bg-cloth-deep"
            >
              <span>Back to Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Swagger UI Styles and Scripts from CDN */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui.css"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={() => setSwaggerReady(true)}
      />

      {/* Main Swagger UI Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8">
        {!swaggerReady && (
          <div className="flex flex-col items-center justify-center py-20 text-ink-soft space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cloth border-t-transparent" />
            <p className="text-sm">Loading API specifications...</p>
          </div>
        )}
        <div id="swagger-ui" className="bg-surface rounded-lg border border-rule p-4 shadow-xs" />
      </main>
    </div>
  );
}

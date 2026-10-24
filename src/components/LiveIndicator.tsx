"use client";

import { useLiveTickets } from "@/hooks/useLiveTickets";

export function LiveIndicator() {
  const { status } = useLiveTickets();

  if (status === "connected") {
    return (
      <div
        role="status"
        aria-live="polite"
        title="Real-time sync active — tickets update instantly"
        className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50/60 px-2 py-0.5 text-xs font-medium text-emerald-800"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
        </span>
        <span className="hidden sm:inline">Live</span>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div
        role="status"
        aria-live="polite"
        title="Connecting to real-time updates..."
        className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-50/60 px-2 py-0.5 text-xs font-medium text-amber-800"
      >
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        </span>
        <span className="hidden sm:inline">Connecting</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      title="Real-time sync offline — background polling active"
      className="flex items-center gap-1.5 rounded-full border border-rule bg-paper px-2 py-0.5 text-xs font-medium text-ink-muted"
    >
      <span className="inline-flex h-2 w-2 rounded-full bg-ink-muted/50" />
      <span className="hidden sm:inline">Offline</span>
    </div>
  );
}

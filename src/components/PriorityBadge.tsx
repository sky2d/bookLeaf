import type { TicketPriority } from "@/generated/prisma/enums";

type PriorityConfig = {
  label: string;
  pillClass: string;
  dotClass: string;
};

const PRIORITY_MAP: Record<TicketPriority, PriorityConfig> = {
  CRITICAL: {
    label: "Critical",
    pillClass: "bg-proof-soft text-proof border-proof/20 font-semibold",
    dotClass: "bg-proof animate-pulse",
  },
  HIGH: {
    label: "High",
    pillClass: "bg-amber-soft text-amber border-amber/20 font-medium",
    dotClass: "bg-amber",
  },
  MEDIUM: {
    label: "Medium",
    pillClass: "bg-cloth-soft text-cloth border-cloth/20 font-medium",
    dotClass: "bg-cloth",
  },
  LOW: {
    label: "Low",
    pillClass: "bg-ink/5 text-ink-soft border-rule font-normal",
    dotClass: "bg-ink-faint",
  },
};

const UNTRIAGED_CONFIG: PriorityConfig = {
  label: "Needs triage",
  pillClass: "bg-amber-soft/50 text-amber border-dashed border-amber/40 font-medium",
  dotClass: "bg-amber",
};

export function PriorityBadge({
  priority,
  className = "",
}: {
  priority: TicketPriority | null | undefined;
  className?: string;
}) {
  const config = priority ? PRIORITY_MAP[priority] ?? UNTRIAGED_CONFIG : UNTRIAGED_CONFIG;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${config.pillClass} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${config.dotClass}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}

import type { TicketStatus } from "@/generated/prisma/enums";

type StatusConfig = {
  label: string;
  pillClass: string;
  dotClass: string;
};

const STATUS_MAP: Record<TicketStatus, StatusConfig> = {
  OPEN: {
    label: "Open",
    pillClass: "bg-cloth-soft text-cloth border-cloth/20",
    dotClass: "bg-cloth",
  },
  IN_PROGRESS: {
    label: "In Progress",
    pillClass: "bg-amber-soft text-amber border-amber/20",
    dotClass: "bg-amber",
  },
  RESOLVED: {
    label: "Resolved",
    pillClass: "bg-leaf-soft text-leaf border-leaf/20",
    dotClass: "bg-leaf",
  },
  CLOSED: {
    label: "Closed",
    pillClass: "bg-ink/5 text-ink-soft border-rule",
    dotClass: "bg-ink-faint",
  },
};

export function StatusBadge({ status, className = "" }: { status: TicketStatus; className?: string }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.OPEN;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.pillClass} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${config.dotClass}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}

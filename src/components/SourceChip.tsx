import type { TriageSource } from "@/generated/prisma/enums";

export interface SourceChipProps {
  source?: TriageSource | null;
  confidence?: number | null;
  reasoning?: string | null;
  className?: string;
}

/**
 * Renders a compact, accessible triage source indicator (AI, Fallback Rule, or Manual)
 * with an informative title tooltip describing the reasoning and confidence.
 */
export function SourceChip({
  source,
  confidence,
  reasoning,
  className = "",
}: SourceChipProps) {
  if (!source) return null;

  let label = "Manual";
  let icon = "👤";
  let colorClasses = "bg-paper text-ink-soft border border-rule";
  let tooltip = "Manually triaged by admin";

  if (source === "AI") {
    label = "AI";
    icon = "✨";
    colorClasses = "bg-cloth-soft/60 text-cloth border border-cloth/20";
    const confidenceText = confidence != null ? `${Math.round(confidence * 100)}% confidence` : "";
    tooltip = `AI Triaged${confidenceText ? ` (${confidenceText})` : ""}${reasoning ? `: ${reasoning}` : ""}`;
  } else if (source === "FALLBACK") {
    label = "Rule";
    icon = "⚡";
    colorClasses =
      "bg-amber-50 text-amber-900 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50";
    tooltip = `Keyword Heuristic Rule${reasoning ? `: ${reasoning}` : ""}`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium transition-all ${colorClasses} ${className}`}
      title={tooltip}
      aria-label={tooltip}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

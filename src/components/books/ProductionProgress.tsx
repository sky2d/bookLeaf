import { PRODUCTION_STAGES } from "@/shared/production";

/** Where an unpublished book sits in the production pipeline (a real sequence, so it's numbered). */
export function ProductionProgress({ stageIndex, stage }: { stageIndex: number; stage: string }) {
  if (stageIndex < 0) return <p className="text-sm text-ink-soft">Current stage: {stage}</p>;

  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-2 text-[13px]" aria-label="Production stages">
      {PRODUCTION_STAGES.map((s, i) => {
        const state = i < stageIndex ? "done" : i === stageIndex ? "current" : "todo";
        return (
          <li
            key={s}
            aria-current={state === "current" ? "step" : undefined}
            className={`rounded-sm px-2 py-1 ${
              state === "done"
                ? "bg-leaf-soft text-leaf"
                : state === "current"
                  ? "bg-cloth text-white font-medium"
                  : "border border-dashed border-rule-strong text-ink-faint"
            }`}
          >
            <span className="sr-only">{state === "done" ? "Done: " : state === "current" ? "Current: " : "Upcoming: "}</span>
            {s}
          </li>
        );
      })}
    </ol>
  );
}

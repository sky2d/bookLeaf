// Production pipeline from the BookLeaf Knowledge Base. A real sequence, so the UI can show progress.
export const PRODUCTION_STAGES = [
  "Manuscript Received",
  "Editing",
  "Cover Design",
  "Typesetting",
  "Proofreading",
  "ISBN Assignment",
  "Printing",
  "Distribution Setup",
  "Published & Live",
] as const;

export const PUBLISHED_STATUS = "Published & Live";

export type ProductionInfo = {
  published: boolean;
  /** Human stage name, e.g. "Cover Design". */
  stage: string;
  /** Index into PRODUCTION_STAGES, or -1 if the source status is unrecognised. */
  stageIndex: number;
};

/** Parses source statuses like "In Production - Cover Design" or "Published & Live". */
export function productionInfo(status: string): ProductionInfo {
  if (status === PUBLISHED_STATUS) {
    return { published: true, stage: PUBLISHED_STATUS, stageIndex: PRODUCTION_STAGES.length - 1 };
  }
  const stage = status.replace(/^In Production\s*-\s*/i, "").trim();
  const stageIndex = PRODUCTION_STAGES.findIndex((s) => s.toLowerCase() === stage.toLowerCase());
  return { published: false, stage, stageIndex };
}

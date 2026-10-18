import type { TimelineEntry } from "@/features/workflow";

import type { ContractHistoryItem } from "../api/contracts";

export function toTimeline(history: ContractHistoryItem[]): TimelineEntry[] {
  return history.map((item) => ({
    at: item.at,
    actorName: item.actorName,
    action: item.action,
    stepName: item.stepName,
    round: item.round,
    comment: item.comment,
  }));
}

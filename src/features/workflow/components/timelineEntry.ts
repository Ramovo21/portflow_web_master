export interface TimelineEntry {
  at: string;
  actorName: string | null;
  onBehalfOfName?: string | null;

  action: string;
  stepName?: string | null;
  round: number;
  comment?: string | null;
}

export function fromInstanceHistory(
  history: {
    at: string;
    user: { fullName: string | null };
    onBehalfOf: { fullName: string | null } | null;
    action: string;
    stepName: string;
    round: number;
    comment: string | null;
  }[],
): TimelineEntry[] {
  return history.map((entry) => ({
    at: entry.at,
    actorName: entry.user.fullName,
    onBehalfOfName: entry.onBehalfOf?.fullName ?? null,
    action: entry.action,
    stepName: entry.stepName,
    round: entry.round,
    comment: entry.comment,
  }));
}

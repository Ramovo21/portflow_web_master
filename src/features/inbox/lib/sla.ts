import dayjs, { type Dayjs } from "dayjs";

import { formatDateTime, formatDueIn } from "@/shared/lib/format";

export type SlaTone = "overdue" | "soon" | "normal" | "none";

export interface SlaInfo {
  tone: SlaTone;
  text: string;
  tooltip?: string;
}

const SOON_MINUTES = 24 * 60;

export function slaInfo(
  dueAt: string | null | undefined,
  startedAt?: string | null,
  now: Dayjs = dayjs(),
): SlaInfo {
  if (!dueAt) return { tone: "none", text: "Không hạn" };
  const { text, overdue } = formatDueIn(dueAt, now);
  const label = text.charAt(0).toUpperCase() + text.slice(1);
  const minutesLeft = dayjs(dueAt).diff(now, "minute");
  const tone: SlaTone = overdue ? "overdue" : minutesLeft < SOON_MINUTES ? "soon" : "normal";
  const tooltip = `Hạn ${formatDateTime(dueAt)}${startedAt ? ` · bắt đầu chờ ${formatDateTime(startedAt)}` : ""}`;
  return { tone, text: label, tooltip };
}

export const SLA_COLORS: Record<SlaTone, string> = {
  overdue: "#cf1322",
  soon: "#d48806",
  normal: "rgba(0, 0, 0, 0.75)",
  none: "rgba(0, 0, 0, 0.35)",
};

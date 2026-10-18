import type { InboxItem } from "@/features/workflow";

export function stepLabel(item: InboxItem): string {
  return item.stepOrder !== null && item.stepName
    ? `Bước ${item.stepOrder} · ${item.stepName}`
    : "—";
}

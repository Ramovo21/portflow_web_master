import { Segmented } from "antd";

import type { InboxCounters } from "@/features/workflow";
import { documentTypeLabel } from "@/shared/lib/statusLabels";

interface Props {
  counters: InboxCounters | undefined;
  value: string | undefined;

  showCounts: boolean;
  onChange(docType: string | undefined): void;
  size?: "small" | "middle";
}

const ALL = "__all";

export function DocumentTypeFilter({
  counters,
  value,
  showCounts,
  onChange,
  size = "middle",
}: Props) {
  const types = counters?.byDocumentType ?? [];
  const known = new Set(types.map((item) => item.documentType));
  const options = [
    { value: ALL, label: showCounts && counters ? `Tất cả ${counters.total}` : "Tất cả" },
    ...types.map((item) => ({
      value: item.documentType,
      label: showCounts
        ? `${documentTypeLabel(item.documentType)} ${item.total}`
        : documentTypeLabel(item.documentType),
    })),

    ...(value && !known.has(value) ? [{ value, label: documentTypeLabel(value) }] : []),
  ];
  return (
    <Segmented
      size={size}
      aria-label="Loại hồ sơ"
      options={options}
      value={value ?? ALL}
      onChange={(next) => onChange(next === ALL ? undefined : String(next))}
    />
  );
}

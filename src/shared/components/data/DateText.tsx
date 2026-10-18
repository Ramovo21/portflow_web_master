import { Tooltip } from "antd";

import { formatDate, formatDateRange, formatDateTime, formatRelative } from "@/shared/lib/format";

export function DateText({ value }: { value: string | null | undefined }) {
  return <span style={{ whiteSpace: "nowrap" }}>{formatDate(value)}</span>;
}

export function DateRangeText({
  from,
  to,
}: {
  from: string | null | undefined;
  to: string | null | undefined;
}) {
  return <span style={{ whiteSpace: "nowrap" }}>{formatDateRange(from, to)}</span>;
}

export function RelativeTime({ value }: { value: string | null | undefined }) {
  if (!value) return <span>—</span>;
  return (
    <Tooltip title={formatDateTime(value)}>
      <span style={{ whiteSpace: "nowrap" }}>{formatRelative(value)}</span>
    </Tooltip>
  );
}

export function DateTimeText({ value }: { value: string | null | undefined }) {
  return <span style={{ whiteSpace: "nowrap" }}>{formatDateTime(value)}</span>;
}

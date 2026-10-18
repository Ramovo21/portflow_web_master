import { Tag } from "antd";

import {
  SIGNING_LABELS,
  statusLabel,
  statusTone,
  type StatusKind,
  type StatusTone,
} from "@/shared/lib/statusLabels";

const COLORS: Record<StatusTone, string> = {
  draft: "default",
  processing: "processing",
  warning: "warning",
  approved: "cyan",
  success: "success",
  error: "error",
  ended: "default",
};

interface Props {
  kind: StatusKind;
  status: string | null | undefined;
}

export function StatusTag({ kind, status }: Props) {
  const tone = statusTone(status);
  return (
    <Tag
      color={COLORS[tone]}
      style={tone === "ended" ? { textDecoration: "line-through" } : undefined}
      data-status={status ?? undefined}
    >
      {statusLabel(kind, status)}
    </Tag>
  );
}

export function SigningTag({ state }: { state: string | null | undefined }) {
  const info = state ? SIGNING_LABELS[state] : undefined;
  if (!info) return null;
  return <Tag color={COLORS[info.tone]}>{info.label}</Tag>;
}

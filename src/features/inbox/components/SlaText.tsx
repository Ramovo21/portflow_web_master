import { Tooltip, Typography } from "antd";

import { slaInfo, SLA_COLORS } from "../lib/sla";

export function SlaText({ dueAt, startedAt }: { dueAt: string | null; startedAt?: string | null }) {
  const info = slaInfo(dueAt, startedAt);
  const content = (
    <Typography.Text
      data-sla={info.tone}
      strong={info.tone === "overdue"}
      style={{ color: SLA_COLORS[info.tone], whiteSpace: "nowrap" }}
    >
      <span aria-hidden style={{ marginInlineEnd: 6 }}>
        {info.tone === "none" ? "–" : info.tone === "normal" ? "○" : "●"}
      </span>
      {info.text}
    </Typography.Text>
  );
  return info.tooltip ? <Tooltip title={info.tooltip}>{content}</Tooltip> : content;
}

import { Steps, Typography } from "antd";

import type { StepDefinition } from "../api/definitions";
import { assigneeShortLabel } from "../lib/labels";

export function FlowPreview({ steps }: { steps: StepDefinition[] }) {
  return (
    <Steps
      orientation="vertical"
      size="small"
      current={-1}
      items={steps.map((step) => ({
        title: step.name || "(chưa đặt tên)",
        status: "wait" as const,
        content: (
          <div style={{ fontSize: 12 }}>
            <div>
              👤 {assigneeShortLabel(step.assignee)}
              {step.requiresAllApprovers ? " – tất cả phải duyệt" : " – bất kỳ 1 người"}
            </div>
            {step.condition && (
              <div style={{ borderLeft: "2px dashed #bfbfbf", paddingLeft: 6, margin: "2px 0" }}>
                Chỉ khi <code>{step.condition}</code> – không thì bỏ qua
              </div>
            )}
            <div>
              {step.slaHours ? `⏱ ${step.slaHours}h · ` : ""}
              {step.onReject === "TERMINATE"
                ? "⛔ từ chối = kết thúc"
                : "↩ từ chối = trả về người gửi"}
            </div>
          </div>
        ),
      }))}
    />
  );
}

export function EmptyFlow() {
  return <Typography.Text type="secondary">Chưa có bước nào.</Typography.Text>;
}

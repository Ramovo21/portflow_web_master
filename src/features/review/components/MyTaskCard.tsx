import { Alert, Button, Card, Checkbox, Flex, Typography } from "antd";

import type { ApprovalActionType, InstanceView } from "@/features/workflow";
import { formatDateTime, formatDueIn } from "@/shared/lib/format";

interface Props {
  instance: InstanceView;
  onBehalfOf: string | null;
  openNext: boolean;
  onOpenNextChange(value: boolean): void;
  onAction(action: ApprovalActionType): void;

  hideButtons?: boolean;
}

export function MyTaskCard({
  instance,
  onBehalfOf,
  openNext,
  onOpenNextChange,
  onAction,
  hideButtons,
}: Props) {
  const current = instance.steps.find((step) => step.state === "CURRENT");
  const next = instance.steps.find((step) => step.state === "REMAINING");
  const due = current?.dueAt ? formatDueIn(current.dueAt) : null;

  return (
    <Card size="small" title="Việc của bạn" style={{ borderColor: "var(--pf-brand)" }}>
      {due?.overdue && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          title={`Bước này đã ${due.text}.`}
        />
      )}
      <Typography.Paragraph style={{ marginBottom: 4 }}>
        Bạn đang giữ bước{" "}
        <b>
          {current?.order}. {current?.name}
        </b>
        {onBehalfOf && <Typography.Text type="secondary"> – thay mặt {onBehalfOf}</Typography.Text>}
      </Typography.Paragraph>
      {due && !due.overdue && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
          Hạn {formatDateTime(current?.dueAt)} · {due.text}
        </Typography.Paragraph>
      )}
      <Typography.Paragraph type="secondary">
        {next ? (
          <>
            Bước kế tiếp: {next.order}. {next.name}
          </>
        ) : (
          "Đây là bước cuối – duyệt xong hồ sơ hoàn tất quy trình."
        )}
      </Typography.Paragraph>
      {!hideButtons && (
        <Flex gap={8} wrap style={{ marginBottom: 12 }}>
          <Button type="primary" onClick={() => onAction("APPROVE")}>
            Duyệt
          </Button>
          <Button onClick={() => onAction("REQUEST_REVISION")}>Yêu cầu sửa</Button>
          <Button danger onClick={() => onAction("REJECT")}>
            Từ chối
          </Button>
        </Flex>
      )}
      <Checkbox checked={openNext} onChange={(event) => onOpenNextChange(event.target.checked)}>
        Mở hồ sơ tiếp theo trong Inbox sau khi xong
      </Checkbox>
    </Card>
  );
}

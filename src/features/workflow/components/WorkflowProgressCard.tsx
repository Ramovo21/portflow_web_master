import { useState } from "react";
import { Alert, Button, Card, Empty, Flex, Skeleton, Space, Typography } from "antd";
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  MinusCircleOutlined,
  RollbackOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";

import { StatusTag } from "@/shared/components/status/StatusTag";
import { formatDateTime, formatDueIn } from "@/shared/lib/format";
import { errorMessage } from "@/shared/lib/problem";

import type { ActionResponse, ApprovalActionType, InstanceView, StepView } from "../api/workflow";
import { useActingOnBehalfOf, useWorkflowOfDocument } from "../hooks/useWorkflow";
import { ApprovalActionModal } from "./ApprovalActionModal";

interface Props {
  documentType: string;
  documentId: string;

  showActions?: boolean;
  showReviewLink?: boolean;

  invalidate?: readonly (readonly unknown[])[];
  onActed?(result: ActionResponse): void;

  instance?: InstanceView | null;
  title?: string;
}

function StepIcon({ step }: { step: StepView }) {
  if (step.state === "DONE") {
    if (step.decision === "REJECTED") return <CloseCircleFilled style={{ color: "#cf1322" }} />;
    if (step.decision === "REVISION_REQUESTED")
      return <RollbackOutlined style={{ color: "#d48806" }} />;
    return <CheckCircleFilled style={{ color: "#389e0d" }} />;
  }
  if (step.state === "CURRENT") return <SyncOutlined spin style={{ color: "var(--pf-brand)" }} />;
  if (step.state === "SKIPPED") return <MinusCircleOutlined style={{ color: "#bfbfbf" }} />;
  return <ClockCircleOutlined style={{ color: "#bfbfbf" }} />;
}

function StepDetail({ step, instance }: { step: StepView; instance: InstanceView }) {
  const secondary = { fontSize: 12 } as const;
  if (step.state === "DONE") {
    return (
      <>
        <Typography.Text type="secondary" style={secondary}>
          {step.actedBy?.fullName ?? "—"} · {formatDateTime(step.completedAt)}
        </Typography.Text>
        {step.comment && (
          <Typography.Paragraph italic style={{ margin: "2px 0 0", fontSize: 13 }}>
            “{step.comment}”
          </Typography.Paragraph>
        )}
      </>
    );
  }
  if (step.state === "CURRENT") {
    const due = step.dueAt ? formatDueIn(step.dueAt) : null;
    const voted = step.requiresAll
      ? new Set(
          instance.history
            .filter(
              (entry) =>
                entry.stepOrder === step.order &&
                entry.round === instance.round &&
                entry.action === "APPROVE",
            )
            .map((entry) => entry.onBehalfOf?.id ?? entry.user.id),
        )
      : null;
    return (
      <>
        <Typography.Text style={secondary}>
          Đang chờ:{" "}
          {step.assignees.map((person, index) => (
            <span key={person.id}>
              {index > 0 && ", "}
              {person.fullName}
              {voted?.has(person.id) && " ✔"}
            </span>
          ))}
        </Typography.Text>
        {voted && (
          <div>
            <Typography.Text type="secondary" style={secondary}>
              Cần tất cả duyệt · {voted.size}/{step.assignees.length} đã duyệt
            </Typography.Text>
          </div>
        )}
        {due && (
          <div>
            <Typography.Text type={due.overdue ? "danger" : "secondary"} style={secondary}>
              Hạn {formatDateTime(step.dueAt)} · {due.text}
            </Typography.Text>
          </div>
        )}
      </>
    );
  }
  if (step.state === "SKIPPED") {
    return (
      <Typography.Text type="secondary" style={secondary}>
        Bỏ qua (điều kiện không thỏa)
      </Typography.Text>
    );
  }
  if (step.state === "REMAINING") {
    return (
      <Typography.Text type="secondary" style={secondary}>
        {step.assigneeHint ? `Suggested: ${step.assigneeHint}` : "Not reached yet"}
      </Typography.Text>
    );
  }
  return (
    <Typography.Text type="secondary" style={secondary}>
      {step.state === "CANCELLED" ? "Đã hủy" : "Not reached"}
    </Typography.Text>
  );
}

export function WorkflowProgressCard({
  documentType,
  documentId,
  showActions = true,
  showReviewLink = true,
  invalidate,
  onActed,
  instance: provided,
  title = "Tiến độ duyệt",
}: Props) {
  const query = useWorkflowOfDocument(documentType, documentId, provided === undefined);
  const instance = provided === undefined ? query.data : provided;
  const [action, setAction] = useState<ApprovalActionType | null>(null);
  const onBehalfOf = useActingOnBehalfOf(instance);

  if (provided === undefined && query.isLoading) {
    return (
      <Card size="small" title={title}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }
  if (provided === undefined && query.isError) {
    return (
      <Card size="small" title={title}>
        <Alert type="warning" showIcon title={errorMessage(query.error)} />
      </Card>
    );
  }
  if (!instance) {
    return (
      <Card size="small" title={title}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="This document has not been submitted for approval."
        />
      </Card>
    );
  }

  return (
    <Card
      size="small"
      title={
        <Space size={8}>
          {title}
          {instance.round > 1 && (
            <Typography.Text type="secondary">· vòng {instance.round}</Typography.Text>
          )}
        </Space>
      }
      extra={
        <Space size={8}>
          <StatusTag kind="WORKFLOW" status={instance.status} />
          {showReviewLink && (
            <Link to={`/review/${instance.documentType}/${instance.documentId}`}>Xem đầy đủ</Link>
          )}
        </Space>
      }
    >
      <ol className="pf-wf-steps" aria-label="Các bước duyệt">
        {instance.steps.map((step) => (
          <li
            key={step.order}
            className={`pf-wf-step pf-wf-step--${step.state.toLowerCase()}`}
            aria-current={step.state === "CURRENT" ? "step" : undefined}
          >
            <span className="pf-wf-step__icon">
              <StepIcon step={step} />
            </span>
            <div style={{ minWidth: 0 }}>
              <Typography.Text strong={step.state === "CURRENT"} delete={step.state === "SKIPPED"}>
                {step.order}. {step.name}
              </Typography.Text>
              <div>
                <StepDetail step={step} instance={instance} />
              </div>
            </div>
          </li>
        ))}
      </ol>

      {showActions && instance.canAct && instance.status === "RUNNING" && (
        <>
          {onBehalfOf && (
            <Typography.Text
              type="secondary"
              style={{ display: "block", marginBottom: 8, fontSize: 12 }}
            >
              Bạn đang duyệt thay mặt <b>{onBehalfOf}</b>.
            </Typography.Text>
          )}
          <Flex gap={8} wrap>
            <Button type="primary" onClick={() => setAction("APPROVE")}>
              Duyệt
            </Button>
            <Button onClick={() => setAction("REQUEST_REVISION")}>Yêu cầu sửa</Button>
            <Button danger onClick={() => setAction("REJECT")}>
              Từ chối
            </Button>
          </Flex>
          <ApprovalActionModal
            instance={instance}
            action={action}
            onClose={() => setAction(null)}
            invalidate={invalidate}
            onDone={onActed}
          />
        </>
      )}
    </Card>
  );
}

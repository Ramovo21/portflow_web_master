import {
  Badge,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Radio,
  Space,
  Switch,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import type { StepDefinition, Violation } from "../api/definitions";
import { circled, ON_REJECT_LABELS } from "../lib/labels";
import { parseViolationPath } from "../lib/violationPath";
import { AssigneePicker } from "./AssigneePicker";
import { ConditionInput } from "./ConditionInput";

interface Props {
  step: StepDefinition;
  index: number;
  total: number;
  documentType: string;
  readOnly?: boolean;
  violations: Violation[];

  highlighted?: boolean;
  onChange(step: StepDefinition): void;
  onMove(delta: -1 | 1): void;
  onDuplicate(): void;
  onRemove(): void;
}

function fieldViolations(violations: Violation[], prefix: string): Violation[] {
  return violations.filter((violation) =>
    parseViolationPath(violation.path).field.startsWith(prefix),
  );
}

export function StepEditorCard({
  step,
  index,
  total,
  documentType,
  readOnly,
  violations,
  highlighted,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: Props) {
  const errors = violations.filter((violation) => violation.severity === "ERROR");
  const warnings = violations.filter((violation) => violation.severity === "WARNING");
  const isLast = index === total - 1;
  const canRequireAll = step.assignee.type === "ROLE" || step.assignee.type === "GROUP";
  const assigneeErrors = fieldViolations(errors, "assignee");
  const status = (prefix: string) =>
    fieldViolations(errors, prefix).length > 0 ? ("error" as const) : undefined;

  return (
    <Card
      id={`wf-step-${index}`}
      size="small"
      data-testid={`step-card-${index}`}
      style={{
        borderColor: errors.length > 0 ? "#ff4d4f" : undefined,
        boxShadow: highlighted
          ? "0 0 0 3px var(--pf-brand-soft), 0 0 0 4px var(--pf-brand)"
          : undefined,
        transition: "box-shadow 0.3s",
        scrollMarginTop: 16,
      }}
      title={
        <Space size={6}>
          <span aria-hidden>{circled(step.order)}</span>
          <Typography.Text strong>{step.name || "(chưa đặt tên)"}</Typography.Text>
          {errors.length > 0 && <Badge status="error" text={`${errors.length} lỗi`} />}
          {warnings.length > 0 && <Badge status="warning" text={`${warnings.length} cảnh báo`} />}
        </Space>
      }
      extra={
        !readOnly && (
          <Space size={0}>
            <Tooltip title="Up">
              <Button
                type="text"
                size="small"
                aria-label={`Đưa bước ${step.order} lên`}
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => onMove(-1)}
              />
            </Tooltip>
            <Tooltip title="Down">
              <Button
                type="text"
                size="small"
                aria-label={`Đưa bước ${step.order} xuống`}
                icon={<ArrowDownOutlined />}
                disabled={isLast}
                onClick={() => onMove(1)}
              />
            </Tooltip>
            <Tooltip title="Duplicate step">
              <Button
                type="text"
                size="small"
                aria-label="Duplicate step"
                icon={<CopyOutlined />}
                onClick={onDuplicate}
              />
            </Tooltip>
            <Tooltip title={total <= 1 ? "At least 1 step is required" : "Delete step"}>
              <Button
                type="text"
                size="small"
                danger
                aria-label={`Xóa bước ${step.order}`}
                icon={<DeleteOutlined />}
                disabled={total <= 1}
                onClick={onRemove}
              />
            </Tooltip>
          </Space>
        )
      }
    >
      <Form
        layout="horizontal"
        labelCol={{ flex: "120px" }}
        labelAlign="left"
        colon={false}
        disabled={readOnly}
      >
        <Form.Item
          label="Tên bước"
          validateStatus={status("name")}
          help={fieldViolations(errors, "name")[0]?.message}
          style={{ marginBottom: 12 }}
        >
          <Input
            aria-label={`Tên bước ${step.order}`}
            maxLength={100}
            value={step.name}
            onChange={(event) => onChange({ ...step, name: event.target.value })}
          />
        </Form.Item>
        <Form.Item
          label="Người duyệt"
          validateStatus={assigneeErrors.length > 0 ? "error" : undefined}
          help={
            assigneeErrors.map((error) => `${error.rule}: ${error.message}`).join(" · ") ||
            undefined
          }
          style={{ marginBottom: 12 }}
        >
          <Space orientation="vertical" style={{ width: "100%" }} size={6}>
            <AssigneePicker
              disabled={readOnly}
              status={assigneeErrors.length > 0 ? "error" : undefined}
              value={step.assignee}
              onChange={(assignee) =>
                onChange({
                  ...step,
                  assignee,
                  requiresAllApprovers:
                    assignee.type === "ROLE" || assignee.type === "GROUP"
                      ? step.requiresAllApprovers
                      : false,
                })
              }
            />
            {step.assignee.type === "ROLE" && (
              <Switch
                size="small"
                checked={step.assignee.scope === "SAME_DEPARTMENT_AS_SUBMITTER"}
                onChange={(checked) =>
                  onChange({
                    ...step,
                    assignee: {
                      ...step.assignee,
                      scope: checked ? "SAME_DEPARTMENT_AS_SUBMITTER" : "ANY",
                    },
                  })
                }
                checkedChildren="Chỉ người cùng phòng với người gửi"
                unCheckedChildren="Mọi phòng"
              />
            )}
            {canRequireAll && (
              <Tooltip title="A single rejection is enough to end the step">
                <Switch
                  size="small"
                  checked={step.requiresAllApprovers}
                  onChange={(checked) => onChange({ ...step, requiresAllApprovers: checked })}
                  checkedChildren="Tất cả phải duyệt"
                  unCheckedChildren="Bất kỳ 1 người"
                />
              </Tooltip>
            )}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Người gửi luôn bị loại khỏi danh sách duyệt hồ sơ của chính mình.
            </Typography.Text>
          </Space>
        </Form.Item>
        <Form.Item
          label="Khi từ chối"
          validateStatus={status("onReject")}
          help={
            [...fieldViolations(errors, "onReject"), ...fieldViolations(warnings, "onReject")]
              .map((violation) => `${violation.rule}: ${violation.message}`)
              .join(" · ") ||
            (isLast && step.onReject === "BACK_TO_SUBMITTER"
              ? "Bước cuối nên là “Kết thúc hồ sơ” (V8)"
              : undefined)
          }
          style={{ marginBottom: 12 }}
        >
          <Radio.Group
            value={step.onReject}
            onChange={(event) => onChange({ ...step, onReject: event.target.value })}
            options={[
              { value: "BACK_TO_SUBMITTER", label: ON_REJECT_LABELS.BACK_TO_SUBMITTER },
              { value: "TERMINATE", label: ON_REJECT_LABELS.TERMINATE },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="Hạn xử lý"
          validateStatus={status("slaHours")}
          help={fieldViolations(errors, "slaHours")[0]?.message}
          style={{ marginBottom: 12 }}
        >
          <Space>
            <InputNumber
              aria-label={`Hạn xử lý bước ${step.order}`}
              min={1}
              max={720}
              value={step.slaHours ?? undefined}
              placeholder="không"
              onChange={(hours) =>
                onChange({ ...step, slaHours: typeof hours === "number" ? hours : null })
              }
              suffix="giờ"
            />
            <Typography.Text type="secondary">
              {step.slaHours
                ? step.slaHours >= 24
                  ? `= ${+(step.slaHours / 24).toFixed(1)} ngày`
                  : ""
                : "để trống = không SLA"}
            </Typography.Text>
          </Space>
        </Form.Item>
        <Form.Item label="Điều kiện" style={{ marginBottom: 0 }}>
          <ConditionInput
            disabled={readOnly}
            documentType={documentType}
            value={step.condition}
            errors={fieldViolations(errors, "condition")}
            onChange={(condition) => onChange({ ...step, condition })}
          />
        </Form.Item>
      </Form>
    </Card>
  );
}

import { Button, Empty, Flex, List, Result, Typography } from "antd";
import { CloseCircleFilled, RightOutlined, WarningFilled } from "@ant-design/icons";

import { formatDateTime } from "@/shared/lib/format";

import type { StepDefinition, Violation } from "../api/definitions";
import { circled } from "../lib/labels";
import { groupByStep } from "../lib/violationPath";

interface Props {
  violations: Violation[] | null;
  checkedAt: string | null;
  steps: StepDefinition[];
  loading?: boolean;

  onRecheck?(): void;
  onJump(stepIndex: number): void;
}

export function ValidationPanel({
  violations,
  checkedAt,
  steps,
  loading,
  onRecheck,
  onJump,
}: Props) {
  const errors = violations?.filter((violation) => violation.severity === "ERROR") ?? [];
  const warnings = violations?.filter((violation) => violation.severity === "WARNING") ?? [];

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Typography.Text type="secondary">
          {checkedAt ? `Kiểm tra lúc ${formatDateTime(checkedAt)}` : "Chưa kiểm tra"}
        </Typography.Text>
        {onRecheck && (
          <Button size="small" loading={loading} onClick={onRecheck}>
            {checkedAt ? "Kiểm tra lại" : "Kiểm tra"}
          </Button>
        )}
      </Flex>
      {violations === null ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Click “Kiểm tra” to run rules V1–V8."
        />
      ) : violations.length === 0 ? (
        <Result status="success" title="Ready to activate" subTitle="No errors or warnings." />
      ) : (
        <>
          <Typography.Paragraph strong type={errors.length > 0 ? "danger" : "warning"}>
            {errors.length > 0 ? `⛔ ${errors.length} lỗi` : ""}
            {errors.length > 0 && warnings.length > 0 ? " · " : ""}
            {warnings.length > 0 ? `⚠ ${warnings.length} cảnh báo` : ""}
            {errors.length > 0 ? " – chưa kích hoạt được" : ""}
          </Typography.Paragraph>
          {[...groupByStep(violations).entries()].map(([stepIndex, items]) => (
            <div key={stepIndex} style={{ marginBottom: 8 }}>
              <Typography.Text strong>
                {stepIndex < 0
                  ? "Chung"
                  : `Bước ${circled(stepIndex + 1)} ${steps[stepIndex]?.name ?? ""}`}
              </Typography.Text>
              <List
                size="small"
                dataSource={items}
                renderItem={(violation) => (
                  <List.Item
                    style={{ cursor: stepIndex >= 0 ? "pointer" : undefined }}
                    onClick={() => stepIndex >= 0 && onJump(stepIndex)}
                    actions={stepIndex >= 0 ? [<RightOutlined key="go" />] : undefined}
                  >
                    <Flex gap={8} align="flex-start">
                      {violation.severity === "ERROR" ? (
                        <CloseCircleFilled style={{ color: "#ff4d4f", marginTop: 4 }} />
                      ) : (
                        <WarningFilled style={{ color: "#faad14", marginTop: 4 }} />
                      )}
                      <span>
                        <b>{violation.rule}</b> {violation.message}
                      </span>
                    </Flex>
                  </List.Item>
                )}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

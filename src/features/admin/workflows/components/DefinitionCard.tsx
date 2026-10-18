import { useState } from "react";
import { Alert, Button, Card, Collapse, Dropdown, Flex, Space, Tag, Typography } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import { StatusTag } from "@/shared/components/status/StatusTag";
import { formatDate, formatRelative } from "@/shared/lib/format";

import type { DefinitionResponse } from "../api/definitions";
import { useRunningInstances } from "../hooks/useDefinitions";
import { RESUBMIT_LABELS, stepsSummary } from "../lib/labels";

interface Props {
  documentType: string;
  name: string;
  versions: DefinitionResponse[];
  onCloneFrom(definition: DefinitionResponse): void;
  onCreateBlank(documentType: string): void;
  busy?: boolean;
}

function RetiredRunning({ definition }: { definition: DefinitionResponse }) {
  const running = useRunningInstances(definition.id);
  if (!running.data) return null;
  return (
    <Typography.Text type="warning">
      ⚠ {running.data} hồ sơ đang chạy theo v{definition.version}
    </Typography.Text>
  );
}

export function DefinitionCard({
  documentType,
  name,
  versions,
  onCloneFrom,
  onCreateBlank,
  busy,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const active = versions.find((version) => version.status === "ACTIVE");
  const drafts = versions.filter((version) => version.status === "DRAFT");
  const retired = versions.filter((version) => version.status === "RETIRED");
  const v7 = (definition: DefinitionResponse) =>
    definition.warnings.some((warning) => warning.rule === "V7");

  return (
    <Card
      size="small"
      title={
        <Space size={8}>
          <Typography.Text strong>{name}</Typography.Text>
          <Typography.Text type="secondary">· {documentType}</Typography.Text>
        </Space>
      }
      extra={
        <Space>
          {active && (
            <Link to={`/admin/workflows/${active.id}`}>
              <Button size="small">Xem v{active.version}</Button>
            </Link>
          )}
          <Dropdown
            disabled={busy}
            menu={{
              items: [
                ...(active
                  ? [{ key: "clone", label: `Từ version đang áp dụng (v${active.version})` }]
                  : []),
                { key: "blank", label: "Trống (1 bước mẫu)" },
              ],
              onClick: ({ key }) =>
                key === "clone" && active ? onCloneFrom(active) : onCreateBlank(documentType),
            }}
          >
            <Button size="small" type="primary" loading={busy}>
              Tạo bản nháp <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {active ? (
        <Space orientation="vertical" size={4} style={{ width: "100%" }}>
          <Space size={8} wrap>
            <StatusTag kind="WORKFLOW_DEFINITION" status="ACTIVE" />
            <Typography.Text>
              v{active.version}
              {active.activatedAt && ` · kích hoạt ${formatDate(active.activatedAt.slice(0, 10))}`}
            </Typography.Text>
          </Space>
          <Typography.Text>{stepsSummary(active.definition.steps)}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Ký điện tử {active.definition.onFinalApprove.emitESign ? "✔" : "✘"} · Gửi lại:{" "}
            {RESUBMIT_LABELS[active.definition.resubmitPolicy]}
          </Typography.Text>
        </Space>
      ) : (
        <Alert
          type="error"
          showIcon
          title="No active workflow – documents of this type cannot be submitted (WF_NO_ACTIVE_DEFINITION)."
        />
      )}
      {drafts.map((draft) => (
        <Flex
          key={draft.id}
          justify="space-between"
          align="center"
          wrap
          gap={8}
          style={{ marginTop: 12 }}
        >
          <Space size={8} wrap>
            <StatusTag kind="WORKFLOW_DEFINITION" status="DRAFT" />
            <Typography.Text>
              v{draft.version} · sửa {formatRelative(draft.updatedAt ?? draft.createdAt)}
            </Typography.Text>
            {v7(draft) && <Tag color="red">V7 chưa có module xử lý</Tag>}
          </Space>
          <Link to={`/admin/workflows/${draft.id}`}>Mở bản nháp</Link>
        </Flex>
      ))}
      {retired.length > 0 && (
        <Collapse
          ghost
          size="small"
          style={{ marginTop: 8 }}
          activeKey={expanded ? ["history"] : []}
          onChange={(keys) => setExpanded(keys.length > 0)}
          items={[
            {
              key: "history",
              label: `Lịch sử: ${retired.map((version) => `v${version.version}`).join(" · ")}`,
              children: (
                <Space orientation="vertical" size={4}>
                  {retired.map((version) => (
                    <Space key={version.id} size={8} wrap>
                      <Link to={`/admin/workflows/${version.id}`}>v{version.version}</Link>
                      <StatusTag kind="WORKFLOW_DEFINITION" status="RETIRED" />
                      {expanded && <RetiredRunning definition={version} />}
                    </Space>
                  ))}
                </Space>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}

import { useState } from "react";
import { Button, Drawer, List, Space, Timeline, Typography } from "antd";
import { Link } from "react-router-dom";

import { StatusTag } from "@/shared/components/status/StatusTag";
import { formatDateTime } from "@/shared/lib/format";

import type { DefinitionResponse } from "../api/definitions";
import { diffDefinitions } from "../lib/diffDefinitions";

interface Props {
  open: boolean;
  onClose(): void;
  versions: DefinitionResponse[];
  current: DefinitionResponse;
}

export function VersionHistoryDrawer({ open, onClose, versions, current }: Props) {
  const [compareId, setCompareId] = useState<string | null>(null);
  const compared = versions.find((version) => version.id === compareId);
  const changes = compared ? diffDefinitions(compared.definition, current.definition) : [];

  return (
    <Drawer open={open} onClose={onClose} title="Lịch sử version" size={520}>
      <Timeline
        items={[...versions]
          .sort((a, b) => b.version - a.version)
          .map((version) => ({
            key: version.id,
            content: (
              <div>
                <Space size={8} wrap>
                  <Typography.Text strong>v{version.version}</Typography.Text>
                  <StatusTag kind="WORKFLOW_DEFINITION" status={version.status} />
                  {version.id === current.id && (
                    <Typography.Text type="secondary">(đang mở)</Typography.Text>
                  )}
                </Space>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Tạo {formatDateTime(version.createdAt)}
                    {version.activatedAt
                      ? ` · kích hoạt ${formatDateTime(version.activatedAt)}`
                      : ""}
                  </Typography.Text>
                </div>
                <Space size={4}>
                  <Link to={`/admin/workflows/${version.id}`} onClick={onClose}>
                    Xem
                  </Link>
                  {version.id !== current.id && (
                    <Button type="link" size="small" onClick={() => setCompareId(version.id)}>
                      So sánh với bản đang mở
                    </Button>
                  )}
                </Space>
              </div>
            ),
          }))}
      />
      {compared && (
        <div>
          <Typography.Title level={5}>
            v{compared.version} → v{current.version}
          </Typography.Title>
          {changes.length === 0 ? (
            <Typography.Text type="secondary">Không có khác biệt.</Typography.Text>
          ) : (
            <List
              size="small"
              dataSource={changes}
              renderItem={(change) => <List.Item>{change.text}</List.Item>}
            />
          )}
        </div>
      )}
    </Drawer>
  );
}

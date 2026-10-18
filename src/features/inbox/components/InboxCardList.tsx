import { Button, Card, Flex, Skeleton, Typography } from "antd";
import { useNavigate } from "react-router-dom";

import type { InboxItem, InboxTab } from "@/features/workflow";
import { RelativeTime } from "@/shared/components/data/DateText";
import { StatusTag } from "@/shared/components/status/StatusTag";

import { reviewPath } from "../lib/paths";
import { slaInfo, SLA_COLORS } from "../lib/sla";
import { stepLabel } from "../lib/stepLabel";
import { InboxDocumentCell } from "./InboxDocumentCell";
import { SlaText } from "./SlaText";

interface Props {
  tab: InboxTab;
  items: InboxItem[];
  total: number;
  loading: boolean;
  empty: React.ReactNode;
  onLoadMore?(): void;
}

export function InboxCardList({ tab, items, total, loading, empty, onLoadMore }: Props) {
  const navigate = useNavigate();
  if (loading && items.length === 0) {
    return (
      <Flex vertical gap={8}>
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index} size="small">
            <Skeleton active title={false} paragraph={{ rows: 3 }} />
          </Card>
        ))}
      </Flex>
    );
  }
  if (items.length === 0) return <>{empty}</>;
  return (
    <Flex vertical gap={8}>
      {items.map((item) => {
        const tone =
          tab === "ASSIGNED"
            ? slaInfo(item.dueAt).tone
            : item.status === "REVISION_REQUESTED"
              ? "soon"
              : "none";
        return (
          <Card
            key={item.instanceId}
            size="small"
            hoverable
            role="link"
            tabIndex={0}
            onClick={() => navigate(reviewPath(item.documentType, item.documentId))}
            onKeyDown={(event) => {
              if (event.key === "Enter") navigate(reviewPath(item.documentType, item.documentId));
            }}
            style={{
              borderInlineStart: `4px solid ${tone === "none" || tone === "normal" ? "var(--pf-border)" : SLA_COLORS[tone]}`,
            }}
          >
            <Flex justify="space-between" gap={8} align="flex-start">
              <InboxDocumentCell item={item} />
              {tab === "ASSIGNED" ? (
                <SlaText dueAt={item.dueAt} startedAt={item.startedAt} />
              ) : (
                <StatusTag kind="WORKFLOW" status={item.status} />
              )}
            </Flex>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {stepLabel(item)}
              {item.submitterName ? ` · từ ${item.submitterName}` : ""} ·{" "}
              <RelativeTime value={item.submittedAt} />
            </Typography.Text>
          </Card>
        );
      })}
      {items.length < total && onLoadMore && (
        <Button block loading={loading} onClick={onLoadMore}>
          Tải thêm ({items.length}/{total})
        </Button>
      )}
    </Flex>
  );
}

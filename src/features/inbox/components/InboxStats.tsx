import { Card, Col, Row, Skeleton, Statistic, Typography } from "antd";

import type { ActingFor } from "@/features/auth/api/me";
import type { InboxCounters } from "@/features/workflow";
import { formatDate } from "@/shared/lib/format";
import { documentTypeLabel } from "@/shared/lib/statusLabels";

interface Props {
  counters: InboxCounters | undefined;
  loading: boolean;
  actingFor: ActingFor[];
  onSelect(filter: { tab: "ASSIGNED"; overdue?: boolean; docType?: string }): void;
}

export function InboxStats({ counters, loading, actingFor, onSelect }: Props) {
  const byType = [...(counters?.byDocumentType ?? [])].sort((a, b) => b.total - a.total);
  const top = byType[0];

  const card = (key: string, title: string, body: React.ReactNode, onClick?: () => void) => (
    <Col key={key} xs={12} md={6}>
      <Card
        size="small"
        hoverable={!!onClick}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        aria-label={onClick ? title : undefined}
        style={{ height: "100%" }}
      >
        {loading ? <Skeleton active title={false} paragraph={{ rows: 2 }} /> : body}
      </Card>
    </Col>
  );

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {card(
        "assigned",
        "Chờ tôi duyệt",
        <Statistic title="Chờ tôi duyệt" value={counters ? counters.total : "—"} />,
        () => onSelect({ tab: "ASSIGNED" }),
      )}
      {card(
        "overdue",
        "Quá hạn",
        <Statistic
          title="Quá hạn"
          value={counters ? counters.overdue : "—"}
          styles={{ content: { color: counters && counters.overdue > 0 ? "#cf1322" : undefined } }}
        />,
        () => onSelect({ tab: "ASSIGNED", overdue: true }),
      )}
      {card(
        "type",
        top ? documentTypeLabel(top.documentType) : "Theo loại hồ sơ",
        <>
          <Statistic
            title={top ? documentTypeLabel(top.documentType) : "Theo loại hồ sơ"}
            value={top ? top.total : 0}
          />
          {byType.length > 1 && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {byType
                .slice(1)
                .map((item) => `${documentTypeLabel(item.documentType)} ${item.total}`)
                .join(" · ")}
            </Typography.Text>
          )}
        </>,
        top ? () => onSelect({ tab: "ASSIGNED", docType: top.documentType }) : undefined,
      )}
      {card(
        "acting",
        "Đang thay mặt",
        <>
          <Statistic
            title="Đang thay mặt"
            value={actingFor.length}
            suffix={actingFor.length > 0 ? "người" : undefined}
          />
          {actingFor.length > 0 && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {actingFor
                .map((item) => `${item.fullName ?? "—"} – đến ${formatDate(item.validTo)}`)
                .join(" · ")}
            </Typography.Text>
          )}
        </>,
      )}
    </Row>
  );
}

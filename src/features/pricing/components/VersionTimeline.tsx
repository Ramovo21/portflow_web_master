import { Checkbox, Empty, Flex, Tag, Timeline, Typography } from "antd";
import { PaperClipOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import { StatusTag } from "@/shared/components/status/StatusTag";
import { formatDate, formatDateRange } from "@/shared/lib/format";

import type { VersionItem } from "../api/priceLists";

interface Props {
  versions: VersionItem[];
  currentId: string;
  selected: string[];
  onSelect(ids: string[]): void;
}

export function VersionTimeline({ versions, currentId, selected, onSelect }: Props) {
  if (versions.length === 0)
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No versions yet." />;
  const referenced = new Set(versions.map((v) => v.previousVersionId).filter(Boolean));
  const inChain = (v: VersionItem) =>
    !!v.previousVersionId ||
    referenced.has(v.id) ||
    v.status === "EFFECTIVE" ||
    v.status === "SUPERSEDED" ||
    v.status === "APPROVED" ||
    v.status === "EXPIRED";
  const chain = versions.filter(inChain);
  const others = versions.filter((v) => !inChain(v));

  const toggle = (id: string, checked: boolean) => {
    const next = checked
      ? [...selected.filter((item) => item !== id), id].slice(-2)
      : selected.filter((item) => item !== id);
    onSelect(next);
  };

  const row = (v: VersionItem) => (
    <Flex gap={8} wrap align="center">
      <Checkbox
        checked={selected.includes(v.id)}
        onChange={(event) => toggle(v.id, event.target.checked)}
        aria-label={`Select v${v.listVersion} to compare`}
      />
      <Typography.Text strong>v{v.listVersion}</Typography.Text>
      <Link to={`/pricing/${v.id}`}>{v.code}</Link>
      {v.revisionNumber > 0 && (
        <Typography.Text type="secondary">rev {v.revisionNumber}</Typography.Text>
      )}
      <StatusTag kind="PRICE_LIST" status={v.status} />
      <Typography.Text type="secondary">{formatDateRange(v.validFrom, v.validTo)}</Typography.Text>
      {v.id === currentId && <Tag color="blue">đang xem</Tag>}
      {v.sourceAddendumId && (
        <Tag icon={<PaperClipOutlined />} color="geekblue">
          Từ phụ lục
        </Tag>
      )}
    </Flex>
  );

  return (
    <Flex vertical gap={16}>
      <Typography.Text type="secondary">Chọn 2 version rồi mở tab So sánh.</Typography.Text>
      <Timeline
        items={chain.map((v, index) => {
          const older = chain[index + 1];
          return {
            key: v.id,
            color:
              v.status === "EFFECTIVE"
                ? "green"
                : v.status === "DRAFT" || v.status === "SUBMITTED"
                  ? "blue"
                  : "gray",
            content: (
              <div>
                {row(v)}
                {older && v.previousVersionId === older.id && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    ▲ thay thế v{older.listVersion} từ {formatDate(v.validFrom)}
                  </Typography.Text>
                )}
              </div>
            ),
          };
        })}
      />
      {others.length > 0 && (
        <div>
          <Typography.Text strong>Bản khác cùng phạm vi</Typography.Text>
          <Timeline
            style={{ marginTop: 8 }}
            items={others.map((v) => ({ key: v.id, color: "gray", content: row(v) }))}
          />
        </div>
      )}
    </Flex>
  );
}

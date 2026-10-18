import { Space, Tag, Typography } from "antd";

import type { InboxItem } from "@/features/workflow";
import { MoneyText } from "@/shared/components/data/MoneyText";
import { documentTypeLabel } from "@/shared/lib/statusLabels";

import { DocumentTypeIcon } from "../lib/documentIcon";

export function InboxDocumentCell({ item }: { item: InboxItem }) {
  return (
    <div style={{ minWidth: 0 }}>
      <Space size={6} wrap>
        <span
          title={documentTypeLabel(item.documentType)}
          aria-label={documentTypeLabel(item.documentType)}
        >
          <DocumentTypeIcon type={item.documentType} />
        </span>
        <Typography.Text strong>
          {item.number ?? documentTypeLabel(item.documentType)}
        </Typography.Text>
        {item.title && <Typography.Text>· {item.title}</Typography.Text>}
      </Space>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {item.customerName}
          {item.amount !== null && (
            <>
              {item.customerName ? " · " : ""}
              <MoneyText value={item.amount} currency={item.currency} short />
            </>
          )}
        </Typography.Text>
        {item.round > 1 && (
          <Tag color="purple" style={{ marginInlineStart: 8 }}>
            vòng {item.round}
          </Tag>
        )}
      </div>
    </div>
  );
}

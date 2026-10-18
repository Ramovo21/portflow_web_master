import { Button, Card, Descriptions } from "antd";
import { ExportOutlined } from "@ant-design/icons";

import type { InstanceView } from "@/features/workflow";
import { DateTimeText } from "@/shared/components/data/DateText";
import { MoneyText } from "@/shared/components/data/MoneyText";
import { DocumentLink } from "@/shared/components/document/DocumentLink";
import { documentTypeLabel } from "@/shared/lib/statusLabels";

export function DocumentSummaryCard({ instance }: { instance: InstanceView }) {
  const doc = instance.document;
  return (
    <Card
      size="small"
      title="Tóm tắt hồ sơ"
      extra={
        <DocumentLink type={instance.documentType} id={instance.documentId}>
          <Button size="small" type="link" icon={<ExportOutlined />}>
            Mở hồ sơ gốc
          </Button>
        </DocumentLink>
      }
    >
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 2 }}
        items={[
          { key: "type", label: "Loại hồ sơ", children: documentTypeLabel(instance.documentType) },
          { key: "number", label: "Số", children: doc.number ?? "—" },
          { key: "title", label: "Tiêu đề", children: doc.title ?? "—", span: { xs: 1, sm: 2 } },
          { key: "customer", label: "Khách hàng", children: doc.customerName ?? "—" },
          {
            key: "amount",
            label: "Giá trị",
            children:
              doc.amount !== null ? <MoneyText value={doc.amount} currency={doc.currency} /> : "—",
          },
          { key: "submitter", label: "Người gửi", children: instance.submitter.fullName ?? "—" },
          {
            key: "submittedAt",
            label: "Gửi lúc",
            children: <DateTimeText value={instance.submittedAt} />,
          },
          {
            key: "version",
            label: "Quy trình",
            children: `phiên bản ${instance.definitionVersion}`,
          },
        ]}
      />
    </Card>
  );
}

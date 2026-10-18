import {
  AuditOutlined,
  DollarOutlined,
  FileTextOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";

export function DocumentTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "CONTRACT":
      return <FileTextOutlined />;
    case "ADDENDUM":
      return <PaperClipOutlined />;
    case "PRICE_LIST":
      return <DollarOutlined />;
    case "PAYMENT_SHEET":
      return <AuditOutlined />;
    default:
      return <FileTextOutlined />;
  }
}

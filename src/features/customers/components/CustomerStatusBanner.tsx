import { Alert, Button } from "antd";

import { formatDate } from "@/shared/lib/format";

import type { Customer } from "../api/customers";

interface Props {
  customer: Customer;
  onReactivate?(): void;
}

export function CustomerStatusBanner({ customer, onReactivate }: Props) {
  if (customer.status !== "SUSPENDED") return null;
  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 16 }}
      title={
        <>
          Khách hàng đang tạm ngưng
          {customer.updatedAt ? ` từ ${formatDate(customer.updatedAt)}` : ""}
          {customer.statusReason ? ` – “${customer.statusReason}”` : ""}.
        </>
      }
      description="Không tạo / gửi duyệt hợp đồng mới; hợp đồng đang hiệu lực vẫn chạy."
      action={
        onReactivate && (
          <Button size="small" onClick={onReactivate}>
            Kích hoạt lại
          </Button>
        )
      }
    />
  );
}

import { formatDate } from "@/shared/lib/format";

import type { OverviewWarning } from "../api/customers";

export function warningText(warning: OverviewWarning): string {
  const when =
    warning.daysLeft <= 0
      ? `hết hạn hôm nay (${formatDate(warning.dueDate)})`
      : `còn ${warning.daysLeft} ngày (${formatDate(warning.dueDate)})`;
  switch (warning.code) {
    case "CONTRACT_EXPIRING":
      return `Hợp đồng ${warning.reference} sắp hết hạn – ${when}`;
    case "PRICE_LIST_EXPIRING":
      return `Bảng giá ${warning.reference} sắp hết hiệu lực – ${when}`;
    default:
      return `${warning.reference} – ${when}`;
  }
}

export const STATUS_GROUPS: {
  value: string;
  label: string;
  status?: string;
  expiringWithinDays?: number;
}[] = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Nháp", status: "DRAFT" },
  { value: "review", label: "Đang duyệt", status: "SUBMITTED,UNDER_REVIEW" },
  { value: "revision", label: "Yêu cầu sửa", status: "REVISION_REQUESTED" },
  { value: "approved", label: "Approved", status: "APPROVED" },
  { value: "active", label: "Đang hiệu lực", status: "ACTIVE" },
  { value: "expiring", label: "Sắp hết hạn ≤30 ngày", expiringWithinDays: 30 },
  { value: "ended", label: "Hết hạn / Đã hủy", status: "EXPIRED,CANCELLED,REJECTED" },
];

export function groupParams(group: string | undefined): {
  status?: string;
  expiringWithinDays?: number;
} {
  const found = STATUS_GROUPS.find((item) => item.value === group);
  return found ? { status: found.status, expiringWithinDays: found.expiringWithinDays } : {};
}

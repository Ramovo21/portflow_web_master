export type StatusKind =
  "CONTRACT" | "ADDENDUM" | "PRICE_LIST" | "WORKFLOW" | "WORKFLOW_DEFINITION" | "CUSTOMER";

export type StatusTone =
  "draft" | "processing" | "warning" | "approved" | "success" | "error" | "ended";

const TONES: Record<string, StatusTone> = {
  DRAFT: "draft",
  SUBMITTED: "processing",
  UNDER_REVIEW: "processing",
  RUNNING: "processing",
  PENDING: "processing",
  REVISION_REQUESTED: "warning",
  APPROVED: "approved",
  ACTIVE: "success",
  EFFECTIVE: "success",
  APPLIED: "success",
  REJECTED: "error",
  SUSPENDED: "error",
  CANCELLED: "ended",
  EXPIRED: "ended",
  SUPERSEDED: "ended",
  RETIRED: "ended",
};

const LABELS: Record<StatusKind, Record<string, string>> = {
  CONTRACT: {
    DRAFT: "Nháp",
    SUBMITTED: "Đã gửi",
    UNDER_REVIEW: "Đang duyệt",
    REVISION_REQUESTED: "Yêu cầu sửa",
    APPROVED: "Approved",
    ACTIVE: "Đang hiệu lực",
    EXPIRED: "Hết hạn",
    REJECTED: "Bị từ chối",
    CANCELLED: "Đã hủy",
  },
  ADDENDUM: {
    DRAFT: "Nháp",
    SUBMITTED: "Đã gửi",
    UNDER_REVIEW: "Đang duyệt",
    REVISION_REQUESTED: "Yêu cầu sửa",
    APPROVED: "Approved",
    APPLIED: "Đã áp dụng",
    REJECTED: "Bị từ chối",
    CANCELLED: "Đã hủy",
  },
  PRICE_LIST: {
    DRAFT: "Nháp",
    SUBMITTED: "Chờ duyệt",
    APPROVED: "Đã duyệt (chờ hiệu lực)",
    EFFECTIVE: "Đang hiệu lực",
    SUPERSEDED: "Đã thay thế",
    EXPIRED: "Hết hạn",
    REJECTED: "Bị từ chối",
    CANCELLED: "Đã hủy",
  },
  WORKFLOW: {
    RUNNING: "Đang chạy",
    REVISION_REQUESTED: "Chờ sửa",
    APPROVED: "Approved",
    REJECTED: "Bị từ chối",
    CANCELLED: "Đã hủy",
    PENDING: "Đang chờ",
  },
  WORKFLOW_DEFINITION: {
    DRAFT: "Nháp",
    ACTIVE: "Đang áp dụng",
    RETIRED: "Ngừng áp dụng",
  },
  CUSTOMER: {
    ACTIVE: "Hoạt động",
    SUSPENDED: "Tạm ngưng",
  },
};

export function statusLabel(kind: StatusKind, status: string | null | undefined): string {
  if (!status) return "—";
  return LABELS[kind][status] ?? status;
}

export function statusTone(status: string | null | undefined): StatusTone {
  return (status && TONES[status]) || "draft";
}

export function statusOptions(kind: StatusKind): { value: string; label: string }[] {
  return Object.entries(LABELS[kind]).map(([value, label]) => ({ value, label }));
}

export const SIGNING_LABELS: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: "Chờ ký", tone: "warning" },
  IN_PROGRESS: { label: "Đang ký", tone: "processing" },
  SIGNED: { label: "Đã ký", tone: "success" },
  FAILED: { label: "Ký lỗi", tone: "error" },
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CONTRACT: "Hợp đồng",
  ADDENDUM: "Phụ lục",
  PRICE_LIST: "Bảng giá",
  PAYMENT_SHEET: "Bảng thanh toán",
  DEMO: "Hồ sơ demo",
};

export function documentTypeLabel(type: string | null | undefined): string {
  return (type && DOCUMENT_TYPE_LABELS[type]) || type || "—";
}

export function documentPath(type: string, id: string): string | undefined {
  switch (type) {
    case "CONTRACT":
      return `/contracts/${id}`;
    case "ADDENDUM":
      return `/addenda/${id}`;
    case "PRICE_LIST":
      return `/pricing/${id}`;
    case "PAYMENT_SHEET":
      return `/billing/${id}`;
    default:
      return undefined;
  }
}

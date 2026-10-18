import type { DataScope } from "./api/me";

const ROLE_LABELS: Record<string, string> = {
  SALES: "NV Kinh doanh",
  SALES_MANAGER: "TP Kinh doanh",
  OPERATIONS: "NV Khai thác",
  OPERATIONS_LEAD: "TP Khai thác",
  ACCOUNTANT: "Kế toán",
  CHIEF_ACCOUNTANT: "Kế toán trưởng",
  LEGAL: "Pháp chế",
  DIRECTOR: "Ban Giám đốc",
  ADMIN: "Quản trị",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CONTRACT: "Hợp đồng",
  ADDENDUM: "Phụ lục",
  PRICE_LIST: "Bảng giá",
  PAYMENT_SHEET: "Bảng thanh toán",
};

export function roleLabel(code: string): string {
  return ROLE_LABELS[code] ?? code;
}

export function documentTypeLabel(code: string): string {
  return DOCUMENT_TYPE_LABELS[code] ?? code;
}

export function dataScopeLabel(scope: DataScope): string {
  return scope === "ALL" ? "Toàn công ty" : "Phòng ban";
}

export function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const picked = words.length === 1 ? words : [words[0], words[words.length - 1]];
  return picked.map((word) => word[0]!.toUpperCase()).join("");
}

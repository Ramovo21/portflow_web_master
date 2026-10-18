import type { AddendumType } from "../api/addenda";

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "BANK_TRANSFER", label: "Chuyển khoản" },
  { value: "CASH", label: "Tiền mặt" },
  { value: "OFFSET", label: "Cấn trừ" },
];

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return PAYMENT_METHODS.find((option) => option.value === method)?.label ?? method;
}

export const ADDENDUM_TYPES: Record<
  AddendumType,
  { label: string; icon: string; description: string; color: string }
> = {
  PRICE_CHANGE: {
    label: "Đổi đơn giá",
    icon: "💰",
    description: "Đổi giá dịch vụ từ một ngày, tạo bảng giá hợp đồng mới.",
    color: "gold",
  },
  EXTENSION: {
    label: "Gia hạn",
    icon: "📅",
    description: "Kéo dài ngày kết thúc (còn ≤ 90 ngày / hết hạn ≤ 30 ngày).",
    color: "blue",
  },
  PAYMENT_TERMS: {
    label: "Điều khoản thanh toán",
    icon: "💳",
    description: "Đổi số ngày, phương thức thanh toán từ một ngày.",
    color: "purple",
  },
  SERVICE_ADDITION: {
    label: "Thêm dịch vụ",
    icon: "➕",
    description: "Bổ sung dịch vụ mới vào hợp đồng từ một ngày.",
    color: "green",
  },
};

export const SCOPE_LABELS: Record<string, string> = {
  CONTRACT: "Bảng giá hợp đồng",
  CUSTOMER: "Bảng giá khách hàng",
  SERVICE_GROUP: "Bảng giá nhóm dịch vụ",
  GLOBAL: "Niêm yết",
};

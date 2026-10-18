import { formatDate, formatMoney } from "@/shared/lib/format";

const LABELS: Record<string, string> = {
  title: "Tiêu đề",
  customerId: "Khách hàng",
  effectiveFrom: "Hiệu lực từ",
  effectiveTo: "Hiệu lực đến",
  value: "Giá trị",
  currency: "Tiền tệ",
  serviceTerms: "Điều khoản dịch vụ",
  "paymentTerms.paymentDays": "Điều khoản thanh toán › Số ngày",
  "paymentTerms.method": "Điều khoản thanh toán › Phương thức",
  "paymentTerms.note": "Điều khoản thanh toán › Ghi chú",
  attachments: "Tệp đính kèm",
};

export function diffPathLabel(path: string): string {
  if (LABELS[path]) return LABELS[path];
  const service = /^services\[(.+)]\.mandatory$/.exec(path);
  if (service) return `Dịch vụ ${service[1]} › Bắt buộc`;
  return path;
}

export function diffValue(path: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (path === "value") return formatMoney(value as number);
  if (path === "effectiveFrom" || path === "effectiveTo") return formatDate(String(value));
  return String(value);
}

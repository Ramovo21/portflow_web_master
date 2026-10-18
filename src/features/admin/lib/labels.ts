const RESOURCE_LABELS: Record<string, string> = {
  Customer: "Khách hàng",
  Contract: "Hợp đồng",
  Addendum: "Phụ lục",
  ServiceCatalog: "Danh mục dịch vụ",
  PriceList: "Bảng giá",
  Volume: "Sản lượng",
  PaymentSheet: "Thanh toán",
  Workflow: "Quy trình duyệt",
  ESign: "Ký số",
  Audit: "Nhật ký",
  User: "Người dùng",
  Role: "Vai trò",
  DocumentType: "Loại hồ sơ",
  Delegation: "Ủy quyền",
  AI: "Trợ lý AI",
  System: "Hệ thống",
};

export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}

/** "Contract.Read" → nhóm theo phần trước dấu chấm, giữ thứ tự của danh mục. */
export function groupPermissionCatalog(catalog: string[]): { resource: string; codes: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const code of catalog) {
    const resource = code.split(".")[0] ?? code;
    groups.set(resource, [...(groups.get(resource) ?? []), code]);
  }
  return [...groups.entries()].map(([resource, codes]) => ({ resource, codes }));
}

export function actionOf(permission: string): string {
  return permission.split(".")[1] ?? permission;
}

export const SYNC_SOURCE_LABELS: Record<string, string> = {
  JIT: "Khi đăng nhập",
  JOB: "Đồng bộ định kỳ",
  MANUAL: "Đồng bộ thủ công",
  SEED: "Dữ liệu mẫu",
};

/** Tên ngắn của kiểu event: "PortFlow.Identity.Api.Events.UserProvisioned, PortFlow…" → "UserProvisioned". */
export function shortTypeName(typeName: string): string {
  const withoutAssembly = typeName.split(",")[0]!.trim();
  return withoutAssembly.slice(withoutAssembly.lastIndexOf(".") + 1);
}

/** Đích nhận event: externalizer RabbitMQ hoặc listener trong tiến trình. */
export function listenerLabel(listenerId: string): string {
  if (/Externalizer/i.test(listenerId)) return "RabbitMQ";
  const name = listenerId.split("(")[0]!;
  return name.slice(name.lastIndexOf(".") + 1) || listenerId;
}

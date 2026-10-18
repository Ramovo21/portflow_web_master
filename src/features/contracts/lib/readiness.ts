export interface ReadinessInput {
  customerActive: boolean | undefined;
  datesValid: boolean;
  serviceCount: number;
  attachmentCount: number;
  serviceTerms: string | null | undefined;
}

export interface ReadinessItem {
  key: string;
  label: string;

  ok: boolean | undefined;
}

export function readinessItems(input: ReadinessInput): ReadinessItem[] {
  return [
    {
      key: "customer",
      label:
        input.customerActive === false ? "The customer is suspended" : "Khách hàng đang hoạt động",
      ok: input.customerActive,
    },
    { key: "dates", label: "Thời hạn hợp lệ (bắt đầu ≤ kết thúc)", ok: input.datesValid },
    {
      key: "services",
      label: input.serviceCount > 0 ? `${input.serviceCount} services` : "No services yet",
      ok: input.serviceCount > 0,
    },
    {
      key: "content",
      label: "Có tệp đính kèm hoặc điều khoản dịch vụ",
      ok: input.attachmentCount > 0 || !!input.serviceTerms?.trim(),
    },
  ];
}

export function isReady(items: ReadinessItem[]): boolean {
  return items.every((item) => item.ok === true);
}

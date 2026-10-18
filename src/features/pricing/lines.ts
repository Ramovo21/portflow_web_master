import type { ServiceItem } from "@/features/catalog/api/catalog";

import type { LineInput } from "./api/priceLists";

export interface EditableLine {
  key: string;
  serviceCode?: string;
  unitPrice?: number | null;
  minQty?: number | null;
  note?: string | null;
}

export const MONEY_INPUT = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

export function parseMoneyInput(text: string | undefined): number {
  const normalized = (text ?? "").replace(/\./g, "").replace(",", ".").trim();
  return (normalized === "" ? undefined : Number(normalized)) as number;
}

let counter = 0;
export function newLine(serviceCode?: string): EditableLine {
  counter += 1;
  return { key: `line-${Date.now()}-${counter}`, serviceCode, unitPrice: null, minQty: 0 };
}

export function toLineInputs(
  lines: EditableLine[],
  services: ServiceItem[] | undefined,
): LineInput[] {
  const byCode = new Map((services ?? []).map((service) => [service.code, service]));
  return lines
    .filter((line) => line.serviceCode)
    .map((line) => ({
      serviceCode: line.serviceCode!,
      unitPrice: line.unitPrice ?? NaN,
      uom: byCode.get(line.serviceCode!)?.uom ?? ("CONT20" as const),
      minQty: line.minQty ?? 0,
      note: line.note || null,
    }));
}

export function lineProblems(lines: EditableLine[]): string[] {
  const problems: string[] = [];
  if (lines.filter((line) => line.serviceCode).length === 0)
    problems.push("Cần ít nhất một dòng giá.");
  for (const line of lines) {
    if (!line.serviceCode) problems.push("Có dòng chưa chọn dịch vụ.");
    else if (line.unitPrice === null || line.unitPrice === undefined) {
      problems.push(`Dịch vụ ${line.serviceCode} chưa có đơn giá.`);
    }
  }
  return [...new Set(problems)];
}

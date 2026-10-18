import dayjs, { type Dayjs } from "dayjs";

import type { Me } from "@/features/auth";

import type {
  PriceLine,
  PriceListAction,
  PriceListDetail,
  PriceListRow,
  PriceScope,
} from "./api/priceLists";

export const SCOPE_META: Record<PriceScope, { label: string; color: string; hint: string }> = {
  CONTRACT: { label: "Hợp đồng", color: "geekblue", hint: "Giá riêng của một hợp đồng" },
  CUSTOMER: {
    label: "Khách hàng",
    color: "purple",
    hint: "Giá chung cho mọi hợp đồng của khách hàng",
  },
  SERVICE_GROUP: { label: "Nhóm DV", color: "gold", hint: "Giá chuẩn của một nhóm dịch vụ" },
  GLOBAL: {
    label: "Toàn hệ thống",
    color: "default",
    hint: "Giá niêm yết – mức dự phòng cuối cùng",
  },
};

export const SCOPE_PRIORITY: PriceScope[] = ["CONTRACT", "CUSTOMER", "SERVICE_GROUP", "GLOBAL"];

export function isOwner(detail: Pick<PriceListDetail, "ownerDepartmentId">, me: Me): boolean {
  return (
    me.dataScope === "ALL" || (!!me.department && me.department.id === detail.ownerDepartmentId)
  );
}

export function priceListActions(
  detail: PriceListDetail,
  me: Me,
  hasPermission: (permission: string) => boolean,
): Set<PriceListAction> {
  if (detail.allowedActions) return new Set(detail.allowedActions);
  const actions = new Set<PriceListAction>();
  const owner = isOwner(detail, me);
  const create = hasPermission("PriceList.Create") && owner;
  const submit = hasPermission("PriceList.Submit") && owner;
  if (detail.status === "DRAFT" && !detail.usedInBilling) {
    if (create) actions.add("UPDATE");
    if (submit) actions.add("SUBMIT");
    if (create && !detail.workflow) actions.add("CANCEL");
  }
  if (detail.status === "REJECTED" && create) actions.add("REVISE");
  if (
    (detail.status === "APPROVED" || detail.status === "EFFECTIVE") &&
    !detail.supersededById &&
    create
  ) {
    actions.add("NEW_VERSION");
  }
  return actions;
}

export function maxDecreasePct(
  lines: { serviceCode: string; unitPrice: number | null | undefined }[],
  previous: Pick<PriceLine, "serviceCode" | "unitPrice">[] | undefined,
): number {
  if (!previous) return 0;
  const before = new Map(previous.map((line) => [line.serviceCode, Number(line.unitPrice)]));
  let max = 0;
  for (const line of lines) {
    const old = before.get(line.serviceCode);
    if (old && old > 0 && line.unitPrice !== null && line.unitPrice !== undefined) {
      max = Math.max(max, ((old - Number(line.unitPrice)) * 100) / old);
    }
  }
  return Math.round(max * 100) / 100;
}

export function expectedApprovalSteps(
  scope: PriceScope | undefined,
  decreasePct: number,
): string[] {
  const steps = ["TP Kinh doanh"];
  if (scope === "GLOBAL" || decreasePct > 10) steps.push("Ban Giám đốc");
  return steps;
}

export function minNewVersionDate(
  base: Pick<PriceListDetail, "validFrom" | "billedThrough">,
): Dayjs {
  const afterFrom = dayjs(base.validFrom).add(1, "day");
  const afterBilled = base.billedThrough ? dayjs(base.billedThrough).add(1, "day") : afterFrom;
  return afterBilled.isAfter(afterFrom) ? afterBilled : afterFrom;
}

const chainKey = (row: Pick<PriceListRow, "scope" | "scopeId" | "serviceType">) =>
  `${row.scope}|${row.scopeId ?? ""}|${row.serviceType}`;

export function latestPerChain(rows: PriceListRow[]): PriceListRow[] {
  const best = new Map<string, PriceListRow>();
  for (const row of rows) {
    const current = best.get(chainKey(row));
    if (!current || row.listVersion > current.listVersion) best.set(chainKey(row), row);
  }
  return rows.filter((row) => best.get(chainKey(row)) === row);
}

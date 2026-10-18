import { formatDate, formatMoney } from "@/shared/lib/format";

import type { AddendumChanges, AddendumResponse, AddendumType } from "../api/addenda";
import { paymentMethodLabel } from "./labels";

export interface AddendumDraft {
  type: AddendumType;
  effectiveFrom: string;
  newEffectiveTo?: string;
  paymentDays?: number;
  paymentMethod?: string;
  paymentNote?: string;

  prices?: Record<string, number | null | undefined>;
  services?: { serviceCode: string; mandatory: boolean }[];
}

export function toChanges(draft: AddendumDraft, currency: string): Record<string, unknown> {
  switch (draft.type) {
    case "EXTENSION":
      return { newEffectiveTo: draft.newEffectiveTo };
    case "PAYMENT_TERMS":
      return {
        paymentDays: draft.paymentDays,
        method: draft.paymentMethod?.trim(),
        note: draft.paymentNote?.trim() || null,
      };
    case "PRICE_CHANGE":
      return {
        lines: Object.entries(draft.prices ?? {})
          .filter(([, price]) => price !== null && price !== undefined)
          .map(([serviceCode, unitPrice]) => ({ serviceCode, unitPrice, currency })),
      };
    case "SERVICE_ADDITION":
      return { services: draft.services ?? [] };
  }
}

export function fromAddendum(addendum: AddendumResponse): AddendumDraft {
  const changes = addendum.changes as Record<string, unknown>;
  const draft: AddendumDraft = { type: addendum.type, effectiveFrom: addendum.effectiveFrom };
  switch (addendum.type) {
    case "EXTENSION":
      return { ...draft, newEffectiveTo: changes.newEffectiveTo as string };
    case "PAYMENT_TERMS":
      return {
        ...draft,
        paymentDays: changes.paymentDays as number,
        paymentMethod: changes.method as string,
        paymentNote: (changes.note as string | null) ?? "",
      };
    case "PRICE_CHANGE":
      return {
        ...draft,
        prices: Object.fromEntries(
          ((changes.lines as { serviceCode: string; unitPrice: number }[]) ?? []).map((line) => [
            line.serviceCode,
            Number(line.unitPrice),
          ]),
        ),
      };
    case "SERVICE_ADDITION":
      return {
        ...draft,
        services: (changes.services as { serviceCode: string; mandatory: boolean }[]) ?? [],
      };
  }
}

export function addendumSummary(
  type: AddendumType,
  changes: AddendumChanges,
  currency?: string,
): string {
  const value = changes as Record<string, unknown>;
  switch (type) {
    case "EXTENSION":
      return `Gia hạn đến ${formatDate(value.newEffectiveTo as string)}`;
    case "PAYMENT_TERMS":
      return `Thanh toán ${value.paymentDays} ngày · ${paymentMethodLabel(value.method as string)}`;
    case "PRICE_CHANGE":
      return (
        (value.lines as { serviceCode: string; unitPrice: number; currency?: string }[]) ?? []
      )
        .map(
          (line) =>
            `${line.serviceCode} → ${formatMoney(line.unitPrice, line.currency ?? currency)}`,
        )
        .join("; ");
    case "SERVICE_ADDITION":
      return `Thêm ${((value.services as { serviceCode: string }[]) ?? []).map((service) => service.serviceCode).join(", ")}`;
  }
}

export function deltaPct(
  current: number | undefined,
  next: number | null | undefined,
): number | undefined {
  if (current === undefined || next === null || next === undefined || current === 0)
    return undefined;
  return Math.round(((next - current) / current) * 10000) / 100;
}

import { z } from "zod";

import type { ContractRequest, ContractResponse } from "../api/contracts";

export const contractSchema = z
  .object({
    customerId: z.string({ error: "Select a customer" }).min(1, "Select a customer"),
    title: z.string().trim().min(1, "Enter a title").max(255, "Maximum 255 characters"),
    effectiveFrom: z.string({ error: "Select a date" }).min(1, "Select a date"),
    effectiveTo: z.string({ error: "Select a date" }).min(1, "Select a date"),
    amount: z
      .number({ error: "Enter the contract value" })
      .min(0, "Value cannot be negative")
      .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
        message: "At most 2 decimal places",
      }),
    currency: z.enum(["VND", "USD"]),
    paymentDays: z
      .number({ error: "Enter the payment term in days" })
      .int("Số ngày là số nguyên")
      .min(0, "Must be between 0 and 365 days")
      .max(365, "Must be between 0 and 365 days"),
    paymentMethod: z.string().trim().min(1, "Select a payment method"),
    paymentNote: z.string().optional(),
    serviceTerms: z.string().optional(),
    services: z.array(z.object({ serviceCode: z.string(), mandatory: z.boolean() })),
  })
  .refine((values) => values.effectiveFrom <= values.effectiveTo, {
    path: ["effectiveTo"],
    message: "Start date must be on or before the end date",
  });

export type ContractFormValues = z.infer<typeof contractSchema>;

export const FIELD_MAP: Record<string, keyof ContractFormValues> = {
  customerId: "customerId",
  title: "title",
  effectiveFrom: "effectiveFrom",
  effectiveTo: "effectiveTo",
  "value.amount": "amount",
  "paymentTerms.paymentDays": "paymentDays",
  "paymentTerms.method": "paymentMethod",
  services: "services",
};

export function toValues(
  contract?: ContractResponse,
  presetCustomerId?: string,
): Partial<ContractFormValues> {
  if (!contract) {
    return {
      customerId: presetCustomerId,
      title: "",
      currency: "VND",
      paymentDays: 30,
      paymentMethod: "BANK_TRANSFER",
      paymentNote: "",
      serviceTerms: "",
      services: [],
    };
  }
  return {
    customerId: contract.customerId,
    title: contract.title,
    effectiveFrom: contract.effectiveFrom,
    effectiveTo: contract.effectiveTo,
    amount: Number(contract.value.amount),
    currency: contract.value.currency === "USD" ? "USD" : "VND",
    paymentDays: contract.paymentTerms.paymentDays,
    paymentMethod: contract.paymentTerms.method,
    paymentNote: contract.paymentTerms.note ?? "",
    serviceTerms: contract.serviceTerms ?? "",
    services: contract.services.map((line) => ({
      serviceCode: line.serviceCode,
      mandatory: line.mandatory,
    })),
  };
}

export function toRequest(values: ContractFormValues): ContractRequest {
  return {
    customerId: values.customerId,
    title: values.title.trim(),
    effectiveFrom: values.effectiveFrom,
    effectiveTo: values.effectiveTo,
    value: { amount: values.amount, currency: values.currency },
    paymentTerms: {
      paymentDays: values.paymentDays,
      method: values.paymentMethod.trim(),
      note: values.paymentNote?.trim() || null,
    },
    serviceTerms: values.serviceTerms?.trim() || null,
    services: values.services,
  };
}

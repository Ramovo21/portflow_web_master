import { z } from "zod";

export const TAX_CODE_PATTERN = /^\d{10}(-\d{3})?$/;
export const PHONE_PATTERN = /^\+?[0-9 .-]{8,20}$/;
export const MIN_SUSPEND_REASON = 10;

export function normalizeTaxCode(raw: string | null | undefined): string {
  return (raw ?? "").replace(/[\s.]/g, "").toUpperCase();
}

export function isValidTaxCode(raw: string | null | undefined): boolean {
  return TAX_CODE_PATTERN.test(normalizeTaxCode(raw));
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximum ${max} characters`)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const contactSchema = z.object({
  name: z
    .string({ error: "Enter a contact name" })
    .trim()
    .min(1, "Enter a contact name")
    .max(255, "Maximum 255 characters"),
  email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((value) => !value || z.email().safeParse(value).success, "Invalid email")
    .transform((value) => (value ? value : null)),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((value) => !value || PHONE_PATTERN.test(value), "Phone number must be 8–20 digits")
    .transform((value) => (value ? value : null)),
  role: optionalText(100),
  primary: z.boolean().default(false),
});

export const customerSchema = z
  .object({
    name: z
      .string({ error: "Enter a customer name" })
      .trim()
      .min(1, "Enter a customer name")
      .max(255, "Maximum 255 characters"),
    taxCode: z.string().optional(),
    address: optionalText(500),
    representative: z
      .object({ fullName: optionalText(255), position: optionalText(255) })
      .optional()
      .nullable(),
    contacts: z.array(contactSchema).default([]),
  })
  .refine(
    (value) => value.contacts.length === 0 || value.contacts.filter((c) => c.primary).length === 1,
    {
      message: "Select one primary contact",
      path: ["contacts"],
    },
  );

export type CustomerFormValues = z.input<typeof customerSchema>;
export type CustomerFormOutput = z.output<typeof customerSchema>;

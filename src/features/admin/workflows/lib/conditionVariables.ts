export interface ConditionVariable {
  name: string;
  label: string;
  kind: "string" | "number" | "boolean";
  example: string;

  providedBy: string[] | null;
}

export const CONDITION_VARIABLES: ConditionVariable[] = [
  {
    name: "docType",
    label: "Loại hồ sơ",
    kind: "string",
    example: "docType == 'CONTRACT'",
    providedBy: null,
  },
  {
    name: "department",
    label: "Mã phòng người gửi",
    kind: "string",
    example: "department == 'KD'",
    providedBy: null,
  },
  {
    name: "amount",
    label: "Giá trị",
    kind: "number",
    example: "amount > 500000000",
    providedBy: ["CONTRACT", "ADDENDUM"],
  },
  {
    name: "currency",
    label: "Loại tiền",
    kind: "string",
    example: "currency == 'USD'",
    providedBy: ["CONTRACT", "ADDENDUM", "PRICE_LIST"],
  },
  {
    name: "customerTier",
    label: "Hạng KH",
    kind: "string",
    example: "customerTier == 'A'",
    providedBy: [],
  },
  {
    name: "isAdjustment",
    label: "Là điều chỉnh",
    kind: "boolean",
    example: "isAdjustment",
    providedBy: ["PAYMENT_SHEET"],
  },
  {
    name: "addendumType",
    label: "Loại phụ lục",
    kind: "string",
    example: "addendumType != 'EXTENSION'",
    providedBy: ["ADDENDUM"],
  },
  {
    name: "scope",
    label: "Phạm vi bảng giá",
    kind: "string",
    example: "scope == 'GLOBAL'",
    providedBy: ["PRICE_LIST"],
  },
  {
    name: "serviceType",
    label: "Nhóm dịch vụ",
    kind: "string",
    example: "serviceType == 'STORAGE'",
    providedBy: ["PRICE_LIST"],
  },
  {
    name: "maxDeltaPct",
    label: "Giảm giá lớn nhất (%)",
    kind: "number",
    example: "maxDeltaPct > 10",
    providedBy: ["PRICE_LIST"],
  },
];

export const CONDITION_TEMPLATES: { label: string; expression: string }[] = [
  { label: "Giá trị lớn hơn…", expression: "amount > 500000000" },
  { label: "Không phải gia hạn", expression: "addendumType != 'EXTENSION'" },
  { label: "Giảm giá trên…%", expression: "maxDeltaPct > 10" },
];

export function isProvided(variable: ConditionVariable, documentType: string): boolean {
  return variable.providedBy === null || variable.providedBy.includes(documentType);
}

export function variablesUsed(expression: string | null | undefined): ConditionVariable[] {
  if (!expression) return [];
  return CONDITION_VARIABLES.filter((variable) =>
    new RegExp(`\\b${variable.name}\\b`).test(expression),
  );
}

export function missingVariables(
  expression: string | null | undefined,
  documentType: string,
): string[] {
  return variablesUsed(expression)
    .filter((variable) => !isProvided(variable, documentType))
    .map((variable) => variable.name);
}

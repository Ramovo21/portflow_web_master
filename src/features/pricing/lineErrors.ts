import { problemOf } from "@/shared/lib/problem";

export function lineErrorCodes(error: unknown, codes: (string | undefined)[]): string[] {
  const problem = problemOf(error);
  const text = `${problem?.detail ?? ""} ${(problem?.errors ?? []).map((item) => `${item.field ?? ""} ${item.message ?? ""}`).join(" ")}`;
  return codes.filter((code): code is string => !!code && text.includes(code));
}

export const LINE_ERROR_CODES = new Set([
  "PRC_LINE_UOM_MISMATCH",
  "PRC_SERVICE_NOT_IN_GROUP",
  "PRC_SERVICE_INACTIVE",
  "PRC_DUPLICATE_LINE",
]);

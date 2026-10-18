import { idempotencyHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";

export type Uom =
  "CONT20" | "CONT40" | "CONT45" | "TEU" | "TON" | "TRIP" | "DAY" | "CONT_DAY" | "SET";

export const UOM_LABELS: Record<Uom, string> = {
  CONT20: "cont 20'",
  CONT40: "cont 40'",
  CONT45: "cont 45'",
  TEU: "TEU",
  TON: "tấn",
  TRIP: "chuyến",
  DAY: "ngày",
  CONT_DAY: "cont·ngày",
  SET: "lần",
};

export const UOM_OPTIONS = (Object.keys(UOM_LABELS) as Uom[]).map((value) => ({
  value,
  label: `${UOM_LABELS[value]} (${value})`,
}));

export function uomLabel(uom: string | null | undefined): string {
  return (uom && UOM_LABELS[uom as Uom]) || uom || "—";
}

export interface ServiceGroup {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  groupCode: string;
  uom: Uom;
  defaultTaxRate: number;
  mandatoryDefault: boolean;
  active: boolean;
}

export interface ServiceFilter {
  groupCode?: string;
  active?: boolean;
  q?: string;
}

export interface ServiceInput {
  code?: string;
  name: string;
  groupCode?: string;
  uom: Uom;

  defaultTaxRate: number;
  mandatoryDefault: boolean;
}

export function fetchServiceGroups(): Promise<ServiceGroup[]> {
  return http.get<ServiceGroup[]>("/v1/service-groups").then((res) => res.data);
}

export function createServiceGroup(
  input: { code: string; name: string },
  key: string,
): Promise<ServiceGroup> {
  return http
    .post<ServiceGroup>("/v1/service-groups", input, idempotencyHeader(key))
    .then((res) => res.data);
}

export function fetchServices(filter: ServiceFilter = {}): Promise<ServiceItem[]> {
  return http.get<ServiceItem[]>("/v1/services", { params: filter }).then((res) => res.data);
}

export function createService(input: ServiceInput, key: string): Promise<ServiceItem> {
  return http
    .post<ServiceItem>("/v1/services", input, idempotencyHeader(key))
    .then((res) => res.data);
}

export function updateService(id: string, input: ServiceInput): Promise<ServiceItem> {
  return http
    .put<ServiceItem>(`/v1/services/${id}`, {
      name: input.name,
      uom: input.uom,
      defaultTaxRate: input.defaultTaxRate,
      mandatoryDefault: input.mandatoryDefault,
    })
    .then((res) => res.data);
}

export function deactivateService(id: string, key: string): Promise<ServiceItem> {
  return http
    .post<ServiceItem>(`/v1/services/${id}/deactivate`, null, idempotencyHeader(key))
    .then((res) => res.data);
}

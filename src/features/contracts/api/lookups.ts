import { idempotencyHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";
import type { PageResponse } from "@/shared/types/api";

import type { AttachmentRef } from "./contracts";

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  groupCode: string;
  uom: string;
  mandatoryDefault: boolean;
  active: boolean;
}

export interface ServiceGroup {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface CustomerOption {
  id: string;
  code: string;
  name: string;
  taxCode: string;
  status: "ACTIVE" | "SUSPENDED";
}

export interface PriceSegment {
  serviceCode: string;
  from: string;
  to: string;
  unitPrice: number;
  currency: string;
  uom: string;
  priceListId: string;
  priceListVersion: number;
  scope: string;
  sourceAddendumId: string | null;
}

export interface Resolution {
  segments: PriceSegment[];
  gaps: { serviceCode: string; from: string; to: string }[];
}

export function fetchServices(): Promise<ServiceItem[]> {
  return http
    .get<ServiceItem[]>("/v1/services", { params: { active: true } })
    .then((res) => res.data);
}

export function fetchServiceGroups(): Promise<ServiceGroup[]> {
  return http.get<ServiceGroup[]>("/v1/service-groups").then((res) => res.data);
}

export function searchCustomers(q: string, status?: "ACTIVE"): Promise<CustomerOption[]> {
  return http
    .get<PageResponse<CustomerOption>>("/v1/customers", {
      params: { q: q || undefined, status, size: 20 },
    })
    .then((res) => res.data.items);
}

export function fetchCustomer(id: string): Promise<CustomerOption> {
  return http.get<CustomerOption>(`/v1/customers/${id}`).then((res) => res.data);
}

export function resolvePrices(
  contractId: string,
  serviceCodes: string[],
  from: string,
  to: string,
): Promise<Resolution> {
  return http
    .get<Resolution>("/v1/price-lists/resolve", {
      params: { contractId, serviceCode: serviceCodes, from, to },
      paramsSerializer: { indexes: null },
    })
    .then((res) => res.data);
}

export function uploadAttachment(
  entityType: "CONTRACT" | "ADDENDUM",
  entityId: string,
  file: File,
  key: string,
): Promise<AttachmentRef> {
  const form = new FormData();
  form.append("entityType", entityType);
  form.append("entityId", entityId);
  form.append("file", file);
  return http
    .post<AttachmentRef>("/v1/attachments", form, { ...idempotencyHeader(key), timeout: 120_000 })
    .then((res) => res.data);
}

export function fetchDownloadUrl(id: string): Promise<{ url: string; expiresAt: string }> {
  return http
    .get<{ url: string; expiresAt: string }>(`/v1/attachments/${id}/download-url`)
    .then((res) => res.data);
}

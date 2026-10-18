import type { Uom } from "@/features/catalog/api/catalog";
import type { WorkflowProgress } from "./types";
import { idempotencyHeader, ifMatchHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";
import type { PageResponse } from "@/shared/types/api";

export type { WorkflowProgress } from "./types";

export type PriceScope = "CONTRACT" | "CUSTOMER" | "SERVICE_GROUP" | "GLOBAL";
export type PriceListStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "EFFECTIVE"
  | "SUPERSEDED"
  | "EXPIRED"
  | "REJECTED"
  | "CANCELLED";

export type PriceListAction = "UPDATE" | "SUBMIT" | "REVISE" | "CANCEL" | "NEW_VERSION";

export interface PriceListRow {
  id: string;
  code: string;
  scope: PriceScope;
  scopeId: string | null;
  serviceType: string;
  name: string;
  listVersion: number;
  revisionNumber: number;
  currency: string;
  status: PriceListStatus;
  validFrom: string;
  validTo: string | null;
  usedInBilling: boolean;
  version: number;
}

export interface PriceLine {
  serviceCode: string;
  serviceName: string | null;
  unitPrice: number;
  uom: Uom;
  minQty: number;
  note: string | null;
}

export interface PriceListDetail {
  id: string;
  code: string;
  scope: PriceScope;
  scopeId: string | null;
  serviceType: string;
  name: string;
  listVersion: number;
  revisionNumber: number;
  currency: string;
  status: PriceListStatus;
  validFrom: string;
  validTo: string | null;
  usedInBilling: boolean;
  billedThrough: string | null;
  previousVersionId: string | null;
  supersededById: string | null;
  sourceAddendumId: string | null;
  ownerDepartmentId: string | null;
  note: string | null;
  version: number;
  createdAt: string;
  updatedAt: string | null;
  lines: PriceLine[];
  workflow: WorkflowProgress | null;
  allowedActions?: PriceListAction[];
}

export interface PriceListHeader {
  scope: PriceScope;
  scopeId: string | null;
  serviceType: string;
  name: string;
  currency: string;
  validFrom: string;
  validTo: string | null;
  note: string | null;
}

export interface LineInput {
  serviceCode: string;
  unitPrice: number;
  uom: Uom;
  minQty: number;
  note?: string | null;
}

export interface VersionItem {
  id: string;
  code: string;
  listVersion: number;
  revisionNumber: number;
  status: PriceListStatus;
  validFrom: string;
  validTo: string | null;
  previousVersionId: string | null;
  supersededById: string | null;
  sourceAddendumId: string | null;
}

export type LineChangeKind = "ADDED" | "REMOVED" | "CHANGED" | "UNCHANGED";

export interface Comparison {
  left: { id: string; code: string; listVersion: number };
  right: { id: string; code: string; listVersion: number };
  lines: {
    serviceCode: string;
    change: LineChangeKind;
    left: number | null;
    right: number | null;
    deltaPct: number | null;
  }[];
  headerChanges: Record<string, (string | null)[]>;
}

export interface OverlapResult {
  ok: boolean;
  conflicts: string[];
}

export interface SubmitResult {
  id: string;
  status: PriceListStatus;
  workflowInstanceId: string;
  currentStepOrder: number | null;
  currentStepName: string | null;
  assigneeIds: string[];
}

export interface PriceSegment {
  serviceCode: string;
  from: string;
  to: string;
  unitPrice: number;
  currency: string;
  uom: string;
  minQty: number;
  priceListId: string;
  priceListVersion: number;
  scope: PriceScope;
  sourceAddendumId: string | null;
}

export interface Resolution {
  segments: PriceSegment[];
  gaps: { serviceCode: string; from: string; to: string }[];
}

export interface PriceListFilter {
  scope?: string;
  scopeId?: string;
  serviceType?: string;
  status?: string;
  validAt?: string;
  page: number;
  size: number;
}

export function fetchPriceLists(filter: PriceListFilter): Promise<PageResponse<PriceListRow>> {
  return http
    .get<PageResponse<PriceListRow>>("/v1/price-lists", { params: filter })
    .then((res) => res.data);
}

export function fetchPriceList(id: string): Promise<PriceListDetail> {
  return http.get<PriceListDetail>(`/v1/price-lists/${id}`).then((res) => res.data);
}

export function createPriceList(
  input: PriceListHeader & { lines: LineInput[] },
  key: string,
): Promise<PriceListDetail> {
  return http
    .post<PriceListDetail>("/v1/price-lists", input, idempotencyHeader(key))
    .then((res) => res.data);
}

export function updatePriceListHeader(
  id: string,
  version: number,
  header: PriceListHeader,
): Promise<PriceListDetail> {
  return http
    .put<PriceListDetail>(`/v1/price-lists/${id}`, header, ifMatchHeader(version))
    .then((res) => res.data);
}

export function replacePriceLines(
  id: string,
  version: number,
  lines: LineInput[],
): Promise<PriceListDetail> {
  return http
    .put<PriceListDetail>(`/v1/price-lists/${id}/lines`, lines, ifMatchHeader(version))
    .then((res) => res.data);
}

export function submitPriceList(id: string, key: string): Promise<SubmitResult> {
  return http
    .post<SubmitResult>(`/v1/price-lists/${id}/submit`, null, idempotencyHeader(key))
    .then((res) => res.data);
}

export function revisePriceList(id: string, key: string): Promise<PriceListDetail> {
  return http
    .post<PriceListDetail>(`/v1/price-lists/${id}/revise`, null, idempotencyHeader(key))
    .then((res) => res.data);
}

export function cancelPriceList(id: string, key: string): Promise<PriceListDetail> {
  return http
    .post<PriceListDetail>(`/v1/price-lists/${id}/cancel`, null, idempotencyHeader(key))
    .then((res) => res.data);
}

export function createNewVersion(
  id: string,
  input: { validFrom: string; copyLines: boolean },
  key: string,
): Promise<PriceListDetail> {
  return http
    .post<PriceListDetail>(`/v1/price-lists/${id}/new-version`, input, idempotencyHeader(key))
    .then((res) => res.data);
}

export function fetchVersions(id: string): Promise<VersionItem[]> {
  return http.get<VersionItem[]>(`/v1/price-lists/${id}/versions`).then((res) => res.data);
}

export function fetchComparison(id: string, withId: string): Promise<Comparison> {
  return http
    .get<Comparison>(`/v1/price-lists/${id}/compare`, { params: { with: withId } })
    .then((res) => res.data);
}

export function checkOverlap(params: {
  scope: PriceScope;
  scopeId?: string | null;
  serviceType: string;
  validFrom: string;
  validTo?: string | null;
  excludeId?: string;
}): Promise<OverlapResult> {
  const clean = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    ),
  );
  return http
    .get<OverlapResult>("/v1/price-lists/overlap-check", { params: clean })
    .then((res) => res.data);
}

export function resolvePrices(params: {
  contractId: string;
  serviceCodes: string[];
  from: string;
  to: string;
}): Promise<Resolution> {
  const search = new URLSearchParams({
    contractId: params.contractId,
    from: params.from,
    to: params.to,
  });
  for (const code of params.serviceCodes) search.append("serviceCode", code);
  return http
    .get<Resolution>(`/v1/price-lists/resolve?${search.toString()}`)
    .then((res) => res.data);
}

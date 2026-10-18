import { idempotencyHeader, ifMatchHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";

import type { SubmitResponse } from "./contracts";

export type AddendumType = "PRICE_CHANGE" | "EXTENSION" | "PAYMENT_TERMS" | "SERVICE_ADDITION";

export type AddendumStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "REVISION_REQUESTED"
  | "APPROVED"
  | "APPLIED"
  | "REJECTED"
  | "CANCELLED";

export type AddendumAction = "UPDATE" | "SUBMIT" | "CANCEL" | "UPLOAD_ATTACHMENT";

export interface PriceChangeLine {
  serviceCode: string;
  unitPrice: number;
  currency: string;
}

export type AddendumChanges =
  | { type?: "PRICE_CHANGE"; lines: PriceChangeLine[] }
  | { type?: "EXTENSION"; newEffectiveTo: string }
  | { type?: "PAYMENT_TERMS"; paymentDays: number; method: string; note: string | null }
  | { type?: "SERVICE_ADDITION"; services: { serviceCode: string; mandatory: boolean }[] };

export interface AddendumResponse {
  id: string;
  contractId: string;
  number: string;
  type: AddendumType;
  effectiveFrom: string;
  changes: AddendumChanges;
  status: AddendumStatus;
  revision: number;
  submitterId: string | null;
  appliedAt: string | null;
  cancelReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;

  allowedActions?: AddendumAction[];
}

export interface AddendumRequest {
  type: AddendumType;
  effectiveFrom: string;
  changes: Record<string, unknown>;
}

export function fetchAddenda(contractId: string): Promise<AddendumResponse[]> {
  return http
    .get<AddendumResponse[]>(`/v1/contracts/${contractId}/addenda`)
    .then((res) => res.data);
}

export function fetchAddendum(id: string): Promise<AddendumResponse> {
  return http.get<AddendumResponse>(`/v1/addenda/${id}`).then((res) => res.data);
}

export function createAddendum(
  contractId: string,
  body: AddendumRequest,
  key: string,
): Promise<AddendumResponse> {
  return http
    .post<AddendumResponse>(`/v1/contracts/${contractId}/addenda`, body, idempotencyHeader(key))
    .then((res) => res.data);
}

export function updateAddendum(
  id: string,
  version: number,
  body: AddendumRequest,
): Promise<AddendumResponse> {
  return http
    .put<AddendumResponse>(`/v1/addenda/${id}`, body, ifMatchHeader(version))
    .then((res) => res.data);
}

export function submitAddendum(id: string, key: string): Promise<SubmitResponse> {
  return http
    .post<SubmitResponse>(`/v1/addenda/${id}/submit`, null, idempotencyHeader(key))
    .then((res) => res.data);
}

export function cancelAddendum(id: string, reason: string, key: string): Promise<AddendumResponse> {
  return http
    .post<AddendumResponse>(`/v1/addenda/${id}/cancel`, { reason }, idempotencyHeader(key))
    .then((res) => res.data);
}

export function fetchAddendumPdf(id: string): Promise<Blob> {
  return http
    .get<Blob>(`/v1/addenda/${id}/pdf`, { responseType: "blob", timeout: 30_000 })
    .then((res) => res.data);
}

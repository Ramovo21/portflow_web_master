import { idempotencyHeader, ifMatchHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";
import type { PageResponse, PersonRef } from "@/shared/types/api";

export type ContractStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "REVISION_REQUESTED"
  | "APPROVED"
  | "ACTIVE"
  | "EXPIRED"
  | "REJECTED"
  | "CANCELLED";

export type SigningState = "NOT_REQUIRED" | "PENDING" | "IN_PROGRESS" | "SIGNED" | "FAILED";

export type ContractAction =
  | "UPDATE"
  | "UPLOAD_ATTACHMENT"
  | "SUBMIT"
  | "CANCEL"
  | "DELETE"
  | "CLONE"
  | "CREATE_ADDENDUM"
  | "PATCH_METADATA";

export interface Money {
  amount: number;
  currency: string;
}

export interface PaymentTerms {
  paymentDays: number;
  method: string;
  note: string | null;
}

export interface ContractServiceLine {
  serviceCode: string;
  mandatory: boolean;
  validFrom: string | null;
  sourceAddendumId: string | null;
}

export interface CurrentStep {
  instanceId: string;
  workflowStatus: string;
  round: number;
  order: number | null;
  name: string | null;
  assignees: PersonRef[];
  totalSteps: number;
  doneSteps: number;
}

export interface ContractTerms {
  contractId: string;
  validFrom: string;
  effectiveTo: string;
  paymentDays: number;
  paymentMethod: string;
  paymentNote: string | null;
  serviceTerms: string | null;
  sourceAddendumId: string | null;
}

export interface AttachmentRef {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  contentType: string;
  sha256: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  locked: boolean;
}

export interface ContractSummary {
  id: string;
  number: string;
  customerId: string;
  title: string;
  status: ContractStatus;
  effectiveFrom: string;
  effectiveTo: string;
  value: number;
  currency: string;
  ownerDepartmentId: string;
  requiresESign: boolean;
  signingState: SigningState;
}

export interface ContractListItem {
  contract: ContractSummary;
  customerName: string | null;
  revision: number;
  updatedAt: string;
  workflow: CurrentStep | null;
}

export interface ContractResponse {
  id: string;
  number: string;
  customerId: string;
  customerName: string | null;

  customerStatus?: "ACTIVE" | "SUSPENDED" | null;
  title: string;
  effectiveFrom: string;
  effectiveTo: string;
  value: Money;
  paymentTerms: PaymentTerms;
  serviceTerms: string | null;
  services: ContractServiceLine[];
  status: ContractStatus;
  revision: number;
  requiresESign: boolean;
  signingState: SigningState;
  supersedesContractId: string | null;
  ownerDepartmentId: string;
  submitterId: string | null;
  approvedAt: string | null;
  activatedAt: string | null;
  cancelReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  allowedActions: ContractAction[];
  workflow: CurrentStep | null;
  currentTerms: ContractTerms | null;
  attachments: AttachmentRef[];
}

export interface ContractRequest {
  customerId: string;
  title: string;
  effectiveFrom: string;
  effectiveTo: string;
  value: Money;
  paymentTerms: { paymentDays: number; method: string; note: string | null };
  serviceTerms: string | null;
  services: { serviceCode: string; mandatory: boolean }[];
}

export interface SubmitResponse {
  id: string;
  status: string;
  revision: number;
  workflow: {
    instanceId: string;
    status: string;
    round: number;
    currentStep: {
      order: number;
      name: string;
      assignees: PersonRef[];
      dueAt: string | null;
    } | null;
  };
}

export interface ContractHistoryItem {
  at: string;
  action: string;
  actorId: string;
  actorName: string | null;
  stepOrder: number | null;
  stepName: string | null;
  round: number;
  comment: string | null;
}

export interface ContractVersionItem {
  revision: number;
  submittedAt: string;
  submittedBy: string;
}

export interface FieldChange {
  path: string;
  before: unknown;
  after: unknown;
  added: string[] | null;
  removed: string[] | null;
}

export interface VersionDiff {
  from: number;
  to: number;
  changes: FieldChange[];
}

export interface ContractListParams {
  customerId?: string;

  status?: string;
  q?: string;
  expiringWithinDays?: number;
  page: number;
  size: number;
}

export function fetchContracts(
  params: ContractListParams,
): Promise<PageResponse<ContractListItem>> {
  return http
    .get<PageResponse<ContractListItem>>("/v1/contracts", { params })
    .then((res) => res.data);
}

export function fetchContract(id: string): Promise<ContractResponse> {
  return http.get<ContractResponse>(`/v1/contracts/${id}`).then((res) => res.data);
}

export function createContract(body: ContractRequest, key: string): Promise<ContractResponse> {
  return http
    .post<ContractResponse>("/v1/contracts", body, idempotencyHeader(key))
    .then((res) => res.data);
}

export function updateContract(
  id: string,
  version: number,
  body: ContractRequest,
): Promise<ContractResponse> {
  return http
    .put<ContractResponse>(`/v1/contracts/${id}`, body, ifMatchHeader(version))
    .then((res) => res.data);
}

export function deleteContract(id: string): Promise<void> {
  return http.delete(`/v1/contracts/${id}`).then(() => undefined);
}

export function submitContract(id: string, key: string): Promise<SubmitResponse> {
  return http
    .post<SubmitResponse>(`/v1/contracts/${id}/submit`, null, idempotencyHeader(key))
    .then((res) => res.data);
}

export function cancelContract(id: string, reason: string, key: string): Promise<ContractResponse> {
  return http
    .post<ContractResponse>(`/v1/contracts/${id}/cancel`, { reason }, idempotencyHeader(key))
    .then((res) => res.data);
}

export function cloneContract(id: string, key: string): Promise<ContractResponse> {
  return http
    .post<ContractResponse>(`/v1/contracts/${id}/clone`, null, idempotencyHeader(key))
    .then((res) => res.data);
}

export function patchContractTitle(id: string, title: string): Promise<ContractResponse> {
  return http
    .patch<ContractResponse>(`/v1/contracts/${id}/metadata`, { title })
    .then((res) => res.data);
}

export function fetchContractHistory(id: string): Promise<ContractHistoryItem[]> {
  return http.get<ContractHistoryItem[]>(`/v1/contracts/${id}/history`).then((res) => res.data);
}

export function fetchContractVersions(id: string): Promise<ContractVersionItem[]> {
  return http.get<ContractVersionItem[]>(`/v1/contracts/${id}/versions`).then((res) => res.data);
}

export function fetchVersionDiff(id: string, from: number, to: number): Promise<VersionDiff> {
  return http
    .get<VersionDiff>(`/v1/contracts/${id}/versions/diff`, { params: { from, to } })
    .then((res) => res.data);
}

export function fetchTermsAt(id: string, at: string): Promise<ContractTerms> {
  return http
    .get<ContractTerms>(`/v1/contracts/${id}/terms`, { params: { at } })
    .then((res) => res.data);
}

export function fetchContractPdf(id: string): Promise<Blob> {
  return http
    .get<Blob>(`/v1/contracts/${id}/pdf`, { responseType: "blob", timeout: 30_000 })
    .then((res) => res.data);
}

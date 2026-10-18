import { idempotencyHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";
import type { PersonRef } from "@/shared/types/api";

export type DefinitionStatus = "DRAFT" | "ACTIVE" | "RETIRED";
export type AssigneeType = "ROLE" | "USER" | "DYNAMIC" | "GROUP";
export type AssigneeScope = "ANY" | "SAME_DEPARTMENT_AS_SUBMITTER";
export type OnRejectPolicy = "TERMINATE" | "BACK_TO_SUBMITTER";
export type ResubmitPolicy = "RESTART" | "RESUME_AT_REQUESTER";

export interface AssigneeRule {
  type: AssigneeType;
  value: string | null;
  scope: AssigneeScope;
  userIds: string[];
}

export interface StepDefinition {
  order: number;
  name: string;
  assignee: AssigneeRule;
  onReject: OnRejectPolicy;
  condition: string | null;
  slaHours: number | null;
  requiresAllApprovers: boolean;
}

export interface DefinitionContent {
  documentType: string;
  resubmitPolicy: ResubmitPolicy;
  steps: StepDefinition[];
  onFinalApprove: { emitESign: boolean };
}

export interface Violation {
  rule: string;
  path: string | null;
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface DefinitionResponse {
  id: string;
  documentType: string;
  version: number;
  status: DefinitionStatus;
  effectiveFrom: string | null;
  definition: DefinitionContent;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  warnings: Violation[];
}

export interface ValidationResult {
  valid: boolean;
  violations: Violation[];
}

export interface ActivationResult {
  definition: DefinitionResponse;
  runningInstancesOnOldVersions: number;
}

export interface SimulatedStep {
  order: number;
  name: string;
  applies: boolean;
  reason: string | null;
  assignees: PersonRef[];
}

export interface SimulationResult {
  path: SimulatedStep[];
  warnings: string[];
}

export interface SimulateRequest {
  context: Record<string, unknown>;
  submitterId?: string | null;
}

const BASE = "/v1/admin/workflow-definitions";

export function fetchDefinitions(
  params: { documentType?: string; status?: DefinitionStatus } = {},
) {
  return http.get<DefinitionResponse[]>(BASE, { params }).then((res) => res.data);
}

export function fetchDefinition(id: string) {
  return http.get<DefinitionResponse>(`${BASE}/${id}`).then((res) => res.data);
}

export function createDefinition(
  content: DefinitionContent,
  effectiveFrom: string | null,
  key: string,
) {
  return http
    .post<DefinitionResponse>(BASE, content, {
      ...idempotencyHeader(key),
      params: effectiveFrom ? { effectiveFrom } : undefined,
    })
    .then((res) => res.data);
}

export function updateDefinition(
  id: string,
  content: DefinitionContent,
  effectiveFrom: string | null,
) {
  return http
    .put<DefinitionResponse>(`${BASE}/${id}`, content, {
      params: effectiveFrom ? { effectiveFrom } : undefined,
    })
    .then((res) => res.data);
}

export function cloneDefinition(id: string, key: string) {
  return http
    .post<DefinitionResponse>(`${BASE}/${id}/clone`, null, idempotencyHeader(key))
    .then((res) => res.data);
}

export function validateDefinition(id: string) {
  return http.post<ValidationResult>(`${BASE}/${id}/validate`).then((res) => res.data);
}

export function activateDefinition(id: string, key: string) {
  return http
    .post<ActivationResult>(`${BASE}/${id}/activate`, null, idempotencyHeader(key))
    .then((res) => res.data);
}

export function simulateDefinition(id: string, request: SimulateRequest) {
  return http.post<SimulationResult>(`${BASE}/${id}/simulate`, request).then((res) => res.data);
}

export function fetchRunningInstances(id: string) {
  return http
    .get<{ definitionId: string; running: number }>(`${BASE}/${id}/running-instances`)
    .then((res) => res.data.running);
}

export interface RoleOption {
  code: string;
  name: string;
  permissions: string[];
}

export interface UserOption {
  id: string;
  username: string;
  fullName: string;
  departmentCode: string | null;
  departmentName: string | null;
  active: boolean;
}

export interface UserRefOption {
  id: string;
  username: string;
  fullName: string;
}

export interface DocumentTypeOption {
  code: string;
  name: string;
  requiresESign: boolean;
  active: boolean;
}

export function fetchRoles() {
  return http.get<RoleOption[]>("/v1/admin/roles").then((res) => res.data);
}

export function fetchUsers(q?: string) {
  return http
    .get<UserOption[]>("/v1/admin/users", { params: { q: q || undefined, active: true } })
    .then((res) => res.data);
}

export function lookupUsersByRole(role: string) {
  return http
    .get<UserRefOption[]>("/v1/users/lookup", { params: { role } })
    .then((res) => res.data);
}

export function fetchDocumentTypes() {
  return http.get<DocumentTypeOption[]>("/v1/admin/document-types").then((res) => res.data);
}

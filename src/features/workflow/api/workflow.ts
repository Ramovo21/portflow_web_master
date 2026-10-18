import { idempotencyHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";
import type { PageResponse, PersonRef } from "@/shared/types/api";

export interface DocumentSummary {
  number: string | null;
  title: string | null;
  customerName: string | null;
  amount: number | null;
  currency: string | null;
}

export type StepState = "DONE" | "CURRENT" | "SKIPPED" | "CANCELLED" | "REMAINING" | "NOT_REACHED";
export type Decision = "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
export type ApprovalActionType = "APPROVE" | "REJECT" | "REQUEST_REVISION";
export type OnReject = "TERMINATE" | "BACK_TO_SUBMITTER";

export interface StepView {
  id: string | null;
  order: number;
  name: string;
  state: StepState;
  decision: Decision | null;
  actedBy: PersonRef | null;
  completedAt: string | null;
  comment: string | null;
  assignees: PersonRef[];
  startedAt: string | null;
  dueAt: string | null;
  overdue: boolean;
  assigneeHint: string | null;

  onReject?: OnReject | null;

  requiresAll?: boolean;
}

export interface HistoryEntry {
  at: string;
  user: PersonRef;
  onBehalfOf: PersonRef | null;
  action: string;
  stepOrder: number;
  stepName: string;
  round: number;
  comment: string | null;
}

export type InstanceStatus =
  "RUNNING" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface InstanceView {
  id: string;
  documentType: string;
  documentId: string;
  document: DocumentSummary;
  status: InstanceStatus;
  round: number;
  definitionVersion: number;
  submitter: PersonRef;
  submittedAt: string;
  completedAt: string | null;
  version: number;
  steps: StepView[];
  remainingSteps: number;
  currentStepId: string | null;
  canAct: boolean;
  history: HistoryEntry[];
}

export interface ActionResponse {
  instanceId: string;
  status: InstanceStatus;
  version: number;
  completedStep: { order: number; name: string; decision: Decision } | null;
  currentStep: {
    id: string;
    order: number;
    name: string;
    assignees: PersonRef[];
    dueAt: string | null;
  } | null;
}

export type InboxTab = "ASSIGNED" | "SUBMITTED" | "WATCHING";

export interface InboxItem {
  instanceId: string;
  documentType: string;
  documentId: string;
  status: InstanceStatus;
  round: number;
  number: string | null;
  title: string | null;
  customerName: string | null;
  amount: number | null;
  currency: string | null;
  submitterId: string;
  submitterName: string | null;
  submittedAt: string;
  stepId: string | null;
  stepOrder: number | null;
  stepName: string | null;
  startedAt: string | null;
  dueAt: string | null;
  overdue: boolean;
}

export interface InboxCounters {
  total: number;
  overdue: number;
  byDocumentType: { documentType: string; total: number; overdue: number }[];
}

export interface InboxParams {
  tab: InboxTab;
  docType?: string;
  overdue?: boolean;
  page: number;
  size: number;
}

export function fetchInbox(params: InboxParams): Promise<PageResponse<InboxItem>> {
  return http.get<PageResponse<InboxItem>>("/v1/inbox", { params }).then((res) => res.data);
}

export function fetchInboxCounters(): Promise<InboxCounters> {
  return http.get<InboxCounters>("/v1/inbox/counters").then((res) => res.data);
}

export function fetchInstance(id: string): Promise<InstanceView> {
  return http.get<InstanceView>(`/v1/workflow-instances/${id}`).then((res) => res.data);
}

export function fetchInstancesOfDocument(
  documentType: string,
  documentId: string,
): Promise<InstanceView[]> {
  return http
    .get<InstanceView[]>("/v1/workflow-instances", { params: { documentType, documentId } })
    .then((res) => res.data);
}

const ACTION_PATH: Record<ApprovalActionType, string> = {
  APPROVE: "approve",
  REJECT: "reject",
  REQUEST_REVISION: "request-revision",
};

export interface ActOnStep {
  instanceId: string;
  stepId: string;
  action: ApprovalActionType;
  comment?: string;
  expectedVersion?: number;
}

export function actOnStep(input: ActOnStep, idempotencyKey: string): Promise<ActionResponse> {
  return http
    .post<ActionResponse>(
      `/v1/workflow-instances/${input.instanceId}/steps/${input.stepId}/${ACTION_PATH[input.action]}`,
      { comment: input.comment || null, expectedVersion: input.expectedVersion ?? null },
      idempotencyHeader(idempotencyKey),
    )
    .then((res) => res.data);
}

export interface WorkflowStartResult {
  instanceId: string;
  status: InstanceStatus;
  round: number;
  currentStepId: string | null;
  currentStepOrder: number | null;
  currentStepName: string | null;
  assigneeIds: string[];
  dueAt: string | null;
}

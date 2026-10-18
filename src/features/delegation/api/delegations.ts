import dayjs from "dayjs";

import { idempotencyHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";

export interface Delegation {
  id: string;
  fromUserId: string;
  fromUserName: string | null;
  toUserId: string;
  toUserName: string | null;
  documentTypes: string[];
  validFrom: string;
  validTo: string;
  reason: string;
  revoked: boolean;
}

export interface DelegationInput {
  fromUserId?: string;
  toUserId: string;
  documentTypes: string[];
  validFrom: string;
  validTo: string;
  reason: string;
}

export interface ApproverOption {
  id: string;
  fullName: string;
  username: string;
  departmentName: string | null;
}

export type DelegationState = "ACTIVE" | "UPCOMING" | "EXPIRED" | "REVOKED";

export const DELEGATION_STATE_LABELS: Record<DelegationState, { label: string; color: string }> = {
  ACTIVE: { label: "Đang hiệu lực", color: "success" },
  UPCOMING: { label: "Sắp hiệu lực", color: "processing" },
  EXPIRED: { label: "Hết hạn", color: "default" },
  REVOKED: { label: "Đã thu hồi", color: "default" },
};

export function delegationState(
  delegation: Pick<Delegation, "revoked" | "validFrom" | "validTo">,
  today = dayjs().format("YYYY-MM-DD"),
): DelegationState {
  if (delegation.revoked) return "REVOKED";
  if (today < delegation.validFrom) return "UPCOMING";
  if (today > delegation.validTo) return "EXPIRED";
  return "ACTIVE";
}

export function fetchDelegations(): Promise<Delegation[]> {
  return http.get<Delegation[]>("/v1/delegations").then((res) => res.data);
}

export function createDelegation(input: DelegationInput, key: string): Promise<Delegation> {
  return http
    .post<Delegation>("/v1/delegations", input, idempotencyHeader(key))
    .then((res) => res.data);
}

export function revokeDelegation(id: string, key: string): Promise<Delegation> {
  return http
    .post<Delegation>(`/v1/delegations/${id}/revoke`, null, idempotencyHeader(key))
    .then((res) => res.data);
}

export function searchApprovers(q?: string): Promise<ApproverOption[]> {
  return http
    .get<ApproverOption[]>("/v1/users/lookup/approvers", { params: { q: q || undefined } })
    .then((res) => res.data);
}

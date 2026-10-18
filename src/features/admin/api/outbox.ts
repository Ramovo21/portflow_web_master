import { idempotencyHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";

/** Event đã lưu cùng giao dịch nghiệp vụ nhưng chưa tới được đích (RabbitMQ / listener). */
export interface IncompletePublication {
  id: string;
  listenerId: string;
  eventType: string;
  publishedAt: string;
  status: string | null;
  completionAttempts: number | null;
  lastResubmittedAt: string | null;
}

export function fetchIncompletePublications(limit = 100): Promise<IncompletePublication[]> {
  return http
    .get<IncompletePublication[]>("/v1/admin/outbox", { params: { limit } })
    .then((res) => res.data);
}

export function resubmitOutbox(key: string): Promise<{ incompleteBefore: number }> {
  return http
    .post<{ incompleteBefore: number }>("/v1/admin/outbox/resubmit", null, {
      ...idempotencyHeader(key),
      timeout: 120_000,
    })
    .then((res) => res.data);
}

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { useIdempotentMutation } from "@/shared/hooks/useIdempotentMutation";

import {
  actOnStep,
  fetchInbox,
  fetchInboxCounters,
  fetchInstance,
  fetchInstancesOfDocument,
  type ActOnStep,
  type InboxParams,
  type InstanceView,
} from "../api/workflow";
import { workflowKeys } from "./queryKeys";

export function useWorkflowOfDocument(
  documentType: string,
  documentId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: workflowKeys.ofDocument(documentType, documentId ?? ""),
    queryFn: async () => (await fetchInstancesOfDocument(documentType, documentId!))[0] ?? null,
    enabled: enabled && !!documentId,
    refetchOnWindowFocus: true,
  });
}

export function useWorkflowInstancesOfDocument(
  documentType: string,
  documentId: string | undefined,
) {
  return useQuery({
    queryKey: [...workflowKeys.ofDocument(documentType, documentId ?? ""), "all"],
    queryFn: () => fetchInstancesOfDocument(documentType, documentId!),
    enabled: !!documentId,
  });
}

export function useWorkflowInstance(id: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.instance(id ?? ""),
    queryFn: () => fetchInstance(id!),
    enabled: !!id,
  });
}

export function useInbox(params: InboxParams) {
  return useQuery({
    queryKey: workflowKeys.inboxList(params),
    queryFn: () => fetchInbox(params),
    placeholderData: (previous) => previous,
  });
}

export function useInboxCounters(enabled = true) {
  return useQuery({
    queryKey: workflowKeys.counters,
    queryFn: fetchInboxCounters,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useApprovalAction(extraInvalidate: readonly (readonly unknown[])[] = []) {
  const queryClient = useQueryClient();
  return useIdempotentMutation((input: ActOnStep, key) => actOnStep(input, key), {
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.all });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.inbox });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.counters });
      for (const key of extraInvalidate) void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useActingOnBehalfOf(instance: InstanceView | null | undefined): string | null {
  const { me } = useSession();
  const current = instance?.steps.find((step) => step.state === "CURRENT");
  if (!current || current.assignees.some((person) => person.id === me.id)) return null;
  const delegator = me.actingFor.find(
    (delegation) =>
      (delegation.documentTypes.length === 0 ||
        delegation.documentTypes.includes(instance!.documentType)) &&
      current.assignees.some((person) => person.id === delegation.userId),
  );
  return delegator?.fullName ?? null;
}

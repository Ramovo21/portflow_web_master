import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useIdempotentMutation } from "@/shared/hooks/useIdempotentMutation";
import { statusOf } from "@/shared/lib/problem";

import {
  activateDefinition,
  cloneDefinition,
  createDefinition,
  fetchDefinition,
  fetchDefinitions,
  fetchDocumentTypes,
  fetchRoles,
  fetchRunningInstances,
  fetchUsers,
  lookupUsersByRole,
  simulateDefinition,
  updateDefinition,
  validateDefinition,
  type DefinitionContent,
  type SimulateRequest,
} from "../api/definitions";

export const definitionKeys = {
  all: ["wf-definitions"] as const,
  one: (id: string) => ["wf-definition", id] as const,
  running: (id: string) => ["wf-running", id] as const,
};

const noRetryOnForbidden = (failureCount: number, error: unknown) =>
  statusOf(error) !== 403 && statusOf(error) !== 404 && failureCount < 2;

export function useDefinitions() {
  return useQuery({ queryKey: definitionKeys.all, queryFn: () => fetchDefinitions() });
}

export function useDefinition(id: string | undefined) {
  return useQuery({
    queryKey: definitionKeys.one(id ?? ""),
    queryFn: () => fetchDefinition(id!),
    enabled: !!id,
    retry: noRetryOnForbidden,
  });
}

export function useRunningInstances(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: definitionKeys.running(id ?? ""),
    queryFn: () => fetchRunningInstances(id!),
    enabled: !!id && enabled,
  });
}

export function useDocumentTypes() {
  return useQuery({
    queryKey: ["wf-ref", "document-types"],
    queryFn: fetchDocumentTypes,
    retry: noRetryOnForbidden,
    staleTime: 5 * 60_000,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["wf-ref", "roles"],
    queryFn: fetchRoles,
    retry: noRetryOnForbidden,
    staleTime: 5 * 60_000,
  });
}

export function useUserSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: ["wf-ref", "users", q],
    queryFn: () => fetchUsers(q),
    retry: noRetryOnForbidden,
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useUsersOfRole(role: string | null | undefined) {
  return useQuery({
    queryKey: ["wf-ref", "lookup", role],
    queryFn: () => lookupUsersByRole(role!),
    enabled: !!role,
    retry: noRetryOnForbidden,
    staleTime: 60_000,
  });
}

function useInvalidateDefinitions() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: definitionKeys.all });
    if (id) void queryClient.invalidateQueries({ queryKey: definitionKeys.one(id) });
  };
}

export function useCreateDefinition() {
  const invalidate = useInvalidateDefinitions();
  return useIdempotentMutation(
    (input: { content: DefinitionContent; effectiveFrom: string | null }, key) =>
      createDefinition(input.content, input.effectiveFrom, key),
    { onSuccess: () => invalidate() },
  );
}

export function useUpdateDefinition(id: string) {
  const invalidate = useInvalidateDefinitions();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: DefinitionContent; effectiveFrom: string | null }) =>
      updateDefinition(id, input.content, input.effectiveFrom),
    onSuccess: (saved) => {
      queryClient.setQueryData(definitionKeys.one(id), saved);
      invalidate();
    },
  });
}

export function useCloneDefinition() {
  const invalidate = useInvalidateDefinitions();
  return useIdempotentMutation((id: string, key) => cloneDefinition(id, key), {
    onSuccess: () => invalidate(),
  });
}

export function useValidateDefinition(id: string) {
  return useMutation({ mutationFn: () => validateDefinition(id) });
}

export function useActivateDefinition(id: string) {
  const queryClient = useQueryClient();
  return useIdempotentMutation((_: void, key) => activateDefinition(id, key), {
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wf-definition"] });
      void queryClient.invalidateQueries({ queryKey: definitionKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["wf-running"] });
    },
  });
}

export function useSimulateDefinition(id: string) {
  return useMutation({ mutationFn: (request: SimulateRequest) => simulateDefinition(id, request) });
}

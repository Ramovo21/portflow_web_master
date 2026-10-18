import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workflowKeys } from "@/features/workflow";
import { useIdempotentMutation } from "@/shared/hooks/useIdempotentMutation";

import {
  cancelContract,
  cloneContract,
  createContract,
  deleteContract,
  fetchContract,
  fetchContractHistory,
  fetchContracts,
  fetchContractVersions,
  fetchTermsAt,
  fetchVersionDiff,
  patchContractTitle,
  submitContract,
  updateContract,
  type ContractListParams,
  type ContractRequest,
} from "../api/contracts";
import { fetchCustomer, fetchServiceGroups, fetchServices, searchCustomers } from "../api/lookups";
import { contractKeys } from "./queryKeys";

export function useContractList(params: ContractListParams) {
  return useQuery({
    queryKey: contractKeys.list(params),
    queryFn: () => fetchContracts(params),
    placeholderData: keepPreviousData,
  });
}

export function useRevisionCount() {
  return useQuery({
    queryKey: contractKeys.list({ status: "REVISION_REQUESTED", size: 1 }),
    queryFn: () => fetchContracts({ status: "REVISION_REQUESTED", page: 0, size: 1 }),
    select: (page) => page.total,
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: contractKeys.detail(id ?? ""),
    queryFn: () => fetchContract(id!),
    enabled: !!id,
    refetchOnWindowFocus: true,
  });
}

export function useContractHistory(id: string | undefined) {
  return useQuery({
    queryKey: contractKeys.history(id ?? ""),
    queryFn: () => fetchContractHistory(id!),
    enabled: !!id,
  });
}

export function useContractVersions(id: string | undefined) {
  return useQuery({
    queryKey: contractKeys.versions(id ?? ""),
    queryFn: () => fetchContractVersions(id!),
    enabled: !!id,
  });
}

export function useVersionDiff(id: string, from: number | undefined, to: number | undefined) {
  return useQuery({
    queryKey: contractKeys.diff(id, from ?? 0, to ?? 0),
    queryFn: () => fetchVersionDiff(id, from!, to!),
    enabled: !!from && !!to && from !== to,
  });
}

export function useTermsAt(id: string, at: string, enabled: boolean) {
  return useQuery({
    queryKey: contractKeys.terms(id, at),
    queryFn: () => fetchTermsAt(id, at),
    enabled,
    retry: false,
  });
}

export function useServices() {
  return useQuery({
    queryKey: contractKeys.services,
    queryFn: fetchServices,
    staleTime: 5 * 60_000,
  });
}

export function useServiceGroups() {
  return useQuery({
    queryKey: contractKeys.serviceGroups,
    queryFn: fetchServiceGroups,
    staleTime: 5 * 60_000,
  });
}

export function useCustomerOptions(q: string, status?: "ACTIVE") {
  return useQuery({
    queryKey: contractKeys.customerSearch(q, status),
    queryFn: () => searchCustomers(q, status),
    placeholderData: keepPreviousData,
  });
}

export function useCustomerOption(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: contractKeys.customer(id ?? ""),
    queryFn: () => fetchCustomer(id!),
    enabled: enabled && !!id,
    retry: false,
  });
}

export function useInvalidateContract() {
  const queryClient = useQueryClient();
  return (id: string) => {
    void queryClient.invalidateQueries({ queryKey: contractKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: contractKeys.lists });
    void queryClient.invalidateQueries({ queryKey: contractKeys.history(id) });
    void queryClient.invalidateQueries({ queryKey: contractKeys.versions(id) });
    void queryClient.invalidateQueries({ queryKey: workflowKeys.ofDocument("CONTRACT", id) });
    void queryClient.invalidateQueries({ queryKey: workflowKeys.inbox });
    void queryClient.invalidateQueries({ queryKey: workflowKeys.counters });
  };
}

export function useCreateContract() {
  return useIdempotentMutation((body: ContractRequest, key) => createContract(body, key));
}

export function useUpdateContract() {
  return useMutation({
    mutationFn: (input: { id: string; version: number; body: ContractRequest }) =>
      updateContract(input.id, input.version, input.body),
  });
}

export function useSubmitContract() {
  const invalidate = useInvalidateContract();
  return useIdempotentMutation((id: string, key) => submitContract(id, key), {
    onSettled: (_data, _error, id) => invalidate(id),
  });
}

export function useCancelContract() {
  const invalidate = useInvalidateContract();
  return useIdempotentMutation(
    (input: { id: string; reason: string }, key) => cancelContract(input.id, input.reason, key),
    { onSettled: (_data, _error, input) => invalidate(input.id) },
  );
}

export function useCloneContract() {
  const queryClient = useQueryClient();
  return useIdempotentMutation((id: string, key) => cloneContract(id, key), {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: contractKeys.lists }),
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContract,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: contractKeys.lists }),
  });
}

export function usePatchTitle() {
  const invalidate = useInvalidateContract();
  return useMutation({
    mutationFn: (input: { id: string; title: string }) => patchContractTitle(input.id, input.title),
    onSettled: (_data, _error, input) => invalidate(input.id),
  });
}

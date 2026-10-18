import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workflowKeys } from "@/features/workflow";
import { useIdempotentMutation } from "@/shared/hooks/useIdempotentMutation";

import {
  cancelAddendum,
  createAddendum,
  fetchAddenda,
  fetchAddendum,
  submitAddendum,
  updateAddendum,
  type AddendumRequest,
} from "../api/addenda";
import { resolvePrices } from "../api/lookups";
import { contractKeys } from "./queryKeys";

export function useAddenda(contractId: string | undefined) {
  return useQuery({
    queryKey: contractKeys.addenda(contractId ?? ""),
    queryFn: () => fetchAddenda(contractId!),
    enabled: !!contractId,
  });
}

export function useAddendum(id: string | undefined) {
  return useQuery({
    queryKey: contractKeys.addendum(id ?? ""),
    queryFn: () => fetchAddendum(id!),
    enabled: !!id,
    refetchOnWindowFocus: true,
  });
}

export function useInvalidateAddendum() {
  const queryClient = useQueryClient();
  return (id: string, contractId: string) => {
    void queryClient.invalidateQueries({ queryKey: contractKeys.addendum(id) });
    void queryClient.invalidateQueries({ queryKey: contractKeys.addenda(contractId) });

    void queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
    void queryClient.invalidateQueries({ queryKey: workflowKeys.ofDocument("ADDENDUM", id) });
    void queryClient.invalidateQueries({ queryKey: workflowKeys.inbox });
    void queryClient.invalidateQueries({ queryKey: workflowKeys.counters });
  };
}

export function useCreateAddendum() {
  return useIdempotentMutation((input: { contractId: string; body: AddendumRequest }, key) =>
    createAddendum(input.contractId, input.body, key),
  );
}

export function useUpdateAddendum() {
  return useMutation({
    mutationFn: (input: { id: string; version: number; body: AddendumRequest }) =>
      updateAddendum(input.id, input.version, input.body),
  });
}

export function useSubmitAddendum() {
  return useIdempotentMutation((id: string, key) => submitAddendum(id, key));
}

export function useCancelAddendum() {
  return useIdempotentMutation((input: { id: string; reason: string }, key) =>
    cancelAddendum(input.id, input.reason, key),
  );
}

export function useCurrentPrices(
  contractId: string,
  serviceCodes: string[],
  at: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["contract-current-prices", contractId, serviceCodes, at],
    queryFn: () => resolvePrices(contractId, serviceCodes, at!, at!),
    enabled: enabled && !!at && serviceCodes.length > 0,
    retry: false,
  });
}

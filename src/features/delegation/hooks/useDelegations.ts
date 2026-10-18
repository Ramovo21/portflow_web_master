import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import { meQueryKey } from "@/features/auth/api/me";
import { useIdempotentMutation } from "@/shared/hooks/useIdempotentMutation";

import {
  createDelegation,
  fetchDelegations,
  revokeDelegation,
  searchApprovers,
  type DelegationInput,
} from "../api/delegations";

export const delegationKeys = {
  all: ["delegations"] as const,
  approvers: (q: string) => ["delegations", "approvers", q] as const,
};

export function useDelegations() {
  return useQuery({ queryKey: delegationKeys.all, queryFn: fetchDelegations });
}

export function useApprovers(q: string) {
  return useQuery({
    queryKey: delegationKeys.approvers(q),
    queryFn: () => searchApprovers(q),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

function useInvalidateDelegations() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: delegationKeys.all });
    void queryClient.invalidateQueries({ queryKey: meQueryKey });
  };
}

export function useCreateDelegation() {
  const invalidate = useInvalidateDelegations();
  return useIdempotentMutation((input: DelegationInput, key) => createDelegation(input, key), {
    onSuccess: invalidate,
  });
}

export function useRevokeDelegation() {
  const invalidate = useInvalidateDelegations();
  return useIdempotentMutation((id: string, key) => revokeDelegation(id, key), {
    onSuccess: invalidate,
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useIdempotentMutation } from "@/shared/hooks/useIdempotentMutation";

import {
  createService,
  createServiceGroup,
  deactivateService,
  fetchServiceGroups,
  fetchServices,
  updateService,
  type ServiceFilter,
  type ServiceInput,
} from "../api/catalog";

export const catalogKeys = {
  groups: ["service-groups"] as const,
  services: (filter: ServiceFilter = {}) => ["services", filter] as const,
  allServices: ["services"] as const,
};

export function useServiceGroups() {
  return useQuery({
    queryKey: catalogKeys.groups,
    queryFn: fetchServiceGroups,
    staleTime: 5 * 60_000,
  });
}

export function useServices(filter: ServiceFilter = {}, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.services(filter),
    queryFn: () => fetchServices(filter),
    staleTime: 5 * 60_000,
    enabled,
  });
}

function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: catalogKeys.groups });
    void queryClient.invalidateQueries({ queryKey: catalogKeys.allServices });
  };
}

export function useCreateServiceGroup() {
  const invalidate = useInvalidateCatalog();
  return useIdempotentMutation(
    (input: { code: string; name: string }, key) => createServiceGroup(input, key),
    { onSuccess: invalidate },
  );
}

export function useCreateService() {
  const invalidate = useInvalidateCatalog();
  return useIdempotentMutation((input: ServiceInput, key) => createService(input, key), {
    onSuccess: invalidate,
  });
}

export function useUpdateService() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServiceInput }) => updateService(id, input),
    onSuccess: invalidate,
  });
}

export function useDeactivateService() {
  const invalidate = useInvalidateCatalog();
  return useIdempotentMutation((id: string, key) => deactivateService(id, key), {
    onSuccess: invalidate,
  });
}

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import { useIdempotentMutation } from "@/shared/hooks/useIdempotentMutation";

import {
  checkTaxCode,
  createCustomer,
  fetchCustomer,
  fetchCustomerContracts,
  fetchCustomerOverview,
  fetchCustomerPriceLists,
  fetchCustomers,
  reactivateCustomer,
  suspendCustomer,
  updateCustomer,
  type CreateCustomerPayload,
  type CustomerListParams,
  type CustomerPayload,
} from "../api/customers";

export const customerKeys = {
  list: (params: CustomerListParams) => ["customers", params] as const,
  all: ["customers"] as const,
  detail: (id: string) => ["customer", id] as const,
  overview: (id: string) => ["customer", id, "overview"] as const,
  taxCode: (taxCode: string) => ["customer-tax-code", taxCode] as const,
  contracts: (customerId: string, status?: string) =>
    ["contracts", { customerId, status }] as const,
  priceLists: (customerId: string) =>
    ["price-lists", { scope: "CUSTOMER", scopeId: customerId }] as const,
};

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => fetchCustomers(params),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ""),
    queryFn: () => fetchCustomer(id!),
    enabled: !!id,
    refetchOnWindowFocus: true,
  });
}

export function useTaxCodeCheck(taxCode: string | undefined) {
  return useQuery({
    queryKey: customerKeys.taxCode(taxCode ?? ""),
    queryFn: () => checkTaxCode(taxCode!),
    enabled: !!taxCode,
    staleTime: 10_000,
  });
}

export function useCustomerContracts(
  customerId: string | undefined,
  enabled: boolean,
  status?: string,
) {
  return useQuery({
    queryKey: customerKeys.contracts(customerId ?? "", status),
    queryFn: () => fetchCustomerContracts(customerId!, status ? { status, size: 1 } : {}),
    enabled: enabled && !!customerId,
  });
}

export function useCustomerPriceLists(customerId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: customerKeys.priceLists(customerId ?? ""),
    queryFn: () => fetchCustomerPriceLists(customerId!),
    enabled: enabled && !!customerId,
  });
}

function useInvalidateCustomer() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    if (id) void queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
  };
}

export function useCreateCustomer() {
  const invalidate = useInvalidateCustomer();
  return useIdempotentMutation(
    (payload: CreateCustomerPayload, key) => createCustomer(payload, key),
    {
      onSuccess: (customer) => invalidate(customer.id),
    },
  );
}

export function useUpdateCustomer() {
  const invalidate = useInvalidateCustomer();
  return useIdempotentMutation(
    (input: { id: string; version: number; payload: CustomerPayload }) =>
      updateCustomer(input.id, input.version, input.payload),
    { onSettled: (_data, _error, input) => invalidate(input.id) },
  );
}

export function useChangeCustomerStatus() {
  const invalidate = useInvalidateCustomer();
  return useIdempotentMutation(
    (input: { id: string; action: "suspend" | "reactivate"; reason: string }, key) =>
      input.action === "suspend"
        ? suspendCustomer(input.id, input.reason, key)
        : reactivateCustomer(input.id, input.reason, key),
    { onSettled: (_data, _error, input) => invalidate(input.id) },
  );
}

export function useCustomerOverview(id: string) {
  return useQuery({
    queryKey: customerKeys.overview(id),
    queryFn: () => fetchCustomerOverview(id),
    staleTime: 30_000,
  });
}

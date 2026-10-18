import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useServiceGroups } from "@/features/catalog/hooks/useCatalog";
import { workflowKeys } from "@/features/workflow";
import { useIdempotentMutation } from "@/shared/hooks/useIdempotentMutation";

import {
  cancelPriceList,
  checkOverlap,
  createNewVersion,
  createPriceList,
  fetchComparison,
  fetchPriceList,
  fetchPriceLists,
  fetchVersions,
  replacePriceLines,
  resolvePrices,
  revisePriceList,
  submitPriceList,
  updatePriceListHeader,
  type LineInput,
  type PriceListFilter,
  type PriceListHeader,
  type PriceScope,
} from "../api/priceLists";
import { fetchContract, fetchCustomer, searchContracts, searchCustomers } from "../api/targets";

export const pricingKeys = {
  lists: ["price-lists"] as const,
  list: (filter: PriceListFilter) => ["price-lists", filter] as const,
  detail: (id: string) => ["price-list", id] as const,
  versions: (id: string) => ["price-list-versions", id] as const,
  compare: (a: string, b: string) => ["price-compare", a, b] as const,
  overlap: (params: object) => ["overlap-check", params] as const,
  resolve: (params: object) => ["resolve", params] as const,
};

export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function usePriceLists(filter: PriceListFilter) {
  return useQuery({
    queryKey: pricingKeys.list(filter),
    queryFn: () => fetchPriceLists(filter),
    placeholderData: keepPreviousData,
  });
}

export function usePriceList(id: string | undefined) {
  return useQuery({
    queryKey: pricingKeys.detail(id ?? ""),
    queryFn: () => fetchPriceList(id!),
    enabled: !!id,
    refetchOnWindowFocus: true,
  });
}

export function usePriceListVersions(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: pricingKeys.versions(id ?? ""),
    queryFn: () => fetchVersions(id!),
    enabled: !!id && enabled,
  });
}

export function useComparison(left: string | undefined, right: string | undefined) {
  return useQuery({
    queryKey: pricingKeys.compare(left ?? "", right ?? ""),
    queryFn: () => fetchComparison(left!, right!),
    enabled: !!left && !!right && left !== right,
  });
}

export interface OverlapParams {
  scope?: PriceScope;
  scopeId?: string | null;
  serviceType?: string;
  validFrom?: string;
  validTo?: string | null;
  excludeId?: string;
}

export function useOverlapCheck(params: OverlapParams) {
  const debounced = useDebouncedValue(params, 400);
  const ready =
    !!debounced.scope &&
    !!debounced.serviceType &&
    !!debounced.validFrom &&
    (debounced.scope === "GLOBAL" || !!debounced.scopeId);
  return useQuery({
    queryKey: pricingKeys.overlap(debounced),
    queryFn: () =>
      checkOverlap({
        scope: debounced.scope!,
        scopeId: debounced.scopeId,
        serviceType: debounced.serviceType!,
        validFrom: debounced.validFrom!,
        validTo: debounced.validTo,
        excludeId: debounced.excludeId,
      }),
    enabled: ready,
    staleTime: 0,
  });
}

export function useResolve(
  params: { contractId: string; serviceCodes: string[]; from: string; to: string } | null,
) {
  return useQuery({
    queryKey: pricingKeys.resolve(params ?? {}),
    queryFn: () => resolvePrices(params!),
    enabled: !!params && params.serviceCodes.length > 0,
    staleTime: 60_000,
  });
}

function useInvalidatePriceList() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: pricingKeys.lists });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: pricingKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: pricingKeys.versions(id) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.ofDocument("PRICE_LIST", id) });
    }
    void queryClient.invalidateQueries({ queryKey: ["price-list-versions"] });
  };
}

export function useCreatePriceList() {
  const invalidate = useInvalidatePriceList();
  return useIdempotentMutation(
    (input: PriceListHeader & { lines: LineInput[] }, key) => createPriceList(input, key),
    { onSuccess: (created) => invalidate(created.id) },
  );
}

export function useUpdateHeader(id: string) {
  const invalidate = useInvalidatePriceList();
  return useMutation({
    mutationFn: ({ version, header }: { version: number; header: PriceListHeader }) =>
      updatePriceListHeader(id, version, header),
    onSuccess: () => invalidate(id),
  });
}

export function useReplaceLines(id: string) {
  const invalidate = useInvalidatePriceList();
  return useMutation({
    mutationFn: ({ version, lines }: { version: number; lines: LineInput[] }) =>
      replacePriceLines(id, version, lines),
    onSuccess: () => invalidate(id),
  });
}

export function useSubmitPriceList() {
  const invalidate = useInvalidatePriceList();
  const queryClient = useQueryClient();
  return useIdempotentMutation((id: string, key) => submitPriceList(id, key), {
    onSettled: (_data, _error, id) => {
      invalidate(id);
      void queryClient.invalidateQueries({ queryKey: workflowKeys.inbox });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.counters });
    },
  });
}

export function useRevisePriceList() {
  const invalidate = useInvalidatePriceList();
  return useIdempotentMutation((id: string, key) => revisePriceList(id, key), {
    onSettled: (_data, _error, id) => invalidate(id),
  });
}

export function useCancelPriceList() {
  const invalidate = useInvalidatePriceList();
  return useIdempotentMutation((id: string, key) => cancelPriceList(id, key), {
    onSettled: (_data, _error, id) => invalidate(id),
  });
}

export function useNewVersion(baseId: string) {
  const invalidate = useInvalidatePriceList();
  return useIdempotentMutation(
    (input: { validFrom: string; copyLines: boolean }, key) => createNewVersion(baseId, input, key),
    { onSuccess: () => invalidate(baseId) },
  );
}

export function useCustomerSearch(q: string) {
  const debounced = useDebouncedValue(q, 300);
  return useQuery({
    queryKey: ["customer-options", debounced],
    queryFn: () => searchCustomers(debounced),
    staleTime: 30_000,
  });
}

export function useContractSearch(q: string) {
  const debounced = useDebouncedValue(q, 300);
  return useQuery({
    queryKey: ["contract-options", debounced],
    queryFn: () => searchContracts(debounced),
    staleTime: 30_000,
  });
}

export function useContractTarget(id: string | null | undefined) {
  return useQuery({
    queryKey: ["contract-target", id],
    queryFn: () => fetchContract(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCustomerTarget(id: string | null | undefined) {
  return useQuery({
    queryKey: ["customer-target", id],
    queryFn: () => fetchCustomer(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useScopeLabel(
  scope: PriceScope,
  scopeId: string | null,
  serviceType?: string,
): string | undefined {
  const customer = useCustomerTarget(scope === "CUSTOMER" ? scopeId : null);
  const contract = useContractTarget(scope === "CONTRACT" ? scopeId : null);
  const groups = useServiceGroups();
  switch (scope) {
    case "GLOBAL":
      return "Toàn hệ thống";
    case "CUSTOMER":
      return customer.data?.name ?? (customer.isError ? shortId(scopeId) : undefined);
    case "CONTRACT":
      return contract.data
        ? `${contract.data.number}`
        : contract.isError
          ? shortId(scopeId)
          : undefined;
    case "SERVICE_GROUP":
      return groups.data?.find((group) => group.id === scopeId || group.code === serviceType)?.name;
  }
}

function shortId(id: string | null): string {
  return id ? `#${id.slice(0, 8)}` : "—";
}

export function useReferencePrices(
  enabled: boolean,
  today: string,
): Map<string, number> | undefined {
  const lists = useQuery({
    queryKey: ["global-reference", today],
    queryFn: () =>
      fetchPriceLists({ scope: "GLOBAL", status: "EFFECTIVE", validAt: today, page: 0, size: 1 }),
    enabled,
    staleTime: 5 * 60_000,
  });
  const detail = usePriceList(enabled ? lists.data?.items[0]?.id : undefined);
  if (!enabled || !detail.data) return undefined;
  return new Map(detail.data.lines.map((line) => [line.serviceCode, Number(line.unitPrice)]));
}

export async function findPriceListIdByCode(
  code: string,
  scope: PriceScope,
  scopeId: string | null | undefined,
  serviceType: string,
): Promise<string | undefined> {
  const page = await fetchPriceLists({
    scope,
    scopeId: scopeId ?? undefined,
    serviceType,
    page: 0,
    size: 100,
  });
  return page.items.find((row) => row.code === code)?.id;
}

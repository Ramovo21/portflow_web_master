import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export const DEFAULT_PAGE_SIZE = 20;

export interface ListState<F extends Record<string, string | undefined>> {
  filters: F;

  page: number;
  size: number;
}

export function useListQuery<F extends Record<string, string | undefined>>(
  filterKeys: (keyof F & string)[],
) {
  const [params, setParams] = useSearchParams();

  const state = useMemo<ListState<F>>(() => {
    const filters = {} as F;
    for (const key of filterKeys) {
      const value = params.get(key);
      (filters as Record<string, string | undefined>)[key] = value ?? undefined;
    }
    return {
      filters,
      page: Math.max(1, Number(params.get("page")) || 1),
      size: Math.min(100, Math.max(1, Number(params.get("size")) || DEFAULT_PAGE_SIZE)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setFilters = useCallback(
    (patch: Partial<F>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === null || value === "") next.delete(key);
            else next.set(key, String(value));
          }
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setPage = useCallback(
    (page: number, size: number) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("page", String(page));
          next.set("size", String(size));
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const clearFilters = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  const hasFilters = filterKeys.some((key) => params.get(key));

  return { ...state, setFilters, setPage, clearFilters, hasFilters };
}

export function toApiParams<F extends Record<string, string | undefined>>(state: ListState<F>) {
  const params: Record<string, string | number> = { page: state.page - 1, size: state.size };
  for (const [key, value] of Object.entries(state.filters)) {
    if (value) params[key] = value;
  }
  return params;
}

import { useRef } from "react";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

import { errorCodeOf } from "@/shared/lib/problem";

export function useIdempotentMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables, idempotencyKey: string) => Promise<TData>,
  options: Omit<
    UseMutationOptions<TData, unknown, TVariables>,
    "mutationFn" | "retry" | "retryDelay"
  > = {},
) {
  const keyRef = useRef<string>(crypto.randomUUID());
  const mutation = useMutation<TData, unknown, TVariables>({
    ...options,
    mutationFn: (variables) => mutationFn(variables, keyRef.current),
    retry: (failureCount, error) =>
      errorCodeOf(error) === "SYS_IDEMPOTENCY_IN_PROGRESS" && failureCount < 3,
    retryDelay: 1000,
  });
  return {
    ...mutation,
    resetKey() {
      keyRef.current = crypto.randomUUID();
      mutation.reset();
    },
  };
}

export function idempotencyHeader(key: string) {
  return { headers: { "Idempotency-Key": key } };
}

export function ifMatchHeader(version: number | null | undefined) {
  return version === null || version === undefined
    ? {}
    : { headers: { "If-Match": `"${version}"` } };
}

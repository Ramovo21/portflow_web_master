import { useQuery } from "@tanstack/react-query";

import { http } from "@/shared/lib/http";

export interface HealthResponse {
  status: "UP" | "DOWN";
  time: string;
}

export function useBackendHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => http.get<HealthResponse>("/health", { skipAuth: true }).then((res) => res.data),
    refetchInterval: 30_000,
    retry: false,
  });
}

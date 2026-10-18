import { useAuth } from "react-oidc-context";

import { useRestoreStatus } from "./oidc";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export function useAuthStatus(): AuthStatus {
  const auth = useAuth();
  const restore = useRestoreStatus();
  if (auth.isAuthenticated) return "authenticated";
  if (auth.isLoading || restore === "pending") return "loading";
  return "anonymous";
}

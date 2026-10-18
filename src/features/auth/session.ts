import { createContext, useContext } from "react";

import type { Me } from "./api/me";

export interface Session {
  me: Me;
  hasPermission(permission: string): boolean;
}

export const SessionContext = createContext<Session | null>(null);

export function createSession(me: Me): Session {
  const permissions = new Set(me.permissions);
  return { me, hasPermission: (permission) => permissions.has(permission) };
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession() must be used within <SessionProvider>");
  return session;
}

export function usePermission(...anyOf: string[]): boolean {
  const { hasPermission } = useSession();
  return anyOf.some(hasPermission);
}

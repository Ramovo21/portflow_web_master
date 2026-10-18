import type { ReactNode } from "react";

import { usePermission } from "../session";

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const allowed = usePermission(...(Array.isArray(permission) ? permission : [permission]));
  return allowed ? children : fallback;
}

import type { ReactNode } from "react";

import { ForbiddenPage } from "../pages/ForbiddenPage";
import { usePermission } from "../session";

export function RequirePermission({ anyOf, children }: { anyOf: string[]; children: ReactNode }) {
  return usePermission(...anyOf) ? children : <ForbiddenPage />;
}

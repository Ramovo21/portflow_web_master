import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { documentPath } from "@/shared/lib/statusLabels";

interface Props {
  type: string;
  id: string;
  children: ReactNode;
}

export function DocumentLink({ type, id, children }: Props) {
  const path = documentPath(type, id);
  return path ? <Link to={path}>{children}</Link> : <>{children}</>;
}

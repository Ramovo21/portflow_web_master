import { Badge } from "antd";

import { useBackendHealth } from "@/shared/hooks/useBackendHealth";

export function BackendStatus() {
  const { data, isPending, isError } = useBackendHealth();

  if (isPending) return <Badge status="processing" text="Đang kết nối backend…" />;
  if (isError || data.status !== "UP") return <Badge status="error" text="Mất kết nối backend" />;
  return <Badge status="success" text="Backend OK" />;
}

import { Tag, Tooltip } from "antd";
import {
  AppstoreOutlined,
  FileTextOutlined,
  GlobalOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import type { PriceScope } from "../api/priceLists";
import { SCOPE_META } from "../domain";
import { useScopeLabel } from "../hooks/usePricing";

const ICONS: Record<PriceScope, React.ReactNode> = {
  CONTRACT: <FileTextOutlined />,
  CUSTOMER: <TeamOutlined />,
  SERVICE_GROUP: <AppstoreOutlined />,
  GLOBAL: <GlobalOutlined />,
};

export function ScopeTag({ scope }: { scope: PriceScope }) {
  const meta = SCOPE_META[scope];
  return (
    <Tooltip title={meta.hint}>
      <Tag color={meta.color} icon={ICONS[scope]}>
        {meta.label}
      </Tag>
    </Tooltip>
  );
}

export function ScopeTargetLabel({
  scope,
  scopeId,
  serviceType,
}: {
  scope: PriceScope;
  scopeId: string | null;
  serviceType?: string;
}) {
  const label = useScopeLabel(scope, scopeId, serviceType);
  return <span>{label ?? "…"}</span>;
}

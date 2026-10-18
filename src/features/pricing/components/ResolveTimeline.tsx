import { Empty, Flex, Tooltip, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import { formatDate, formatMoney } from "@/shared/lib/format";

import type { PriceScope, Resolution } from "../api/priceLists";
import { SCOPE_META, SCOPE_PRIORITY } from "../domain";

const SCOPE_BAR: Record<PriceScope, string> = {
  CONTRACT: "#2f54eb",
  CUSTOMER: "#722ed1",
  SERVICE_GROUP: "#d48806",
  GLOBAL: "#8c8c8c",
};

const GAP_BACKGROUND = "repeating-linear-gradient(135deg, #ff4d4f 0 6px, #fff1f0 6px 12px)";

interface Props {
  result: Resolution;
  from: string;
  to: string;
  serviceCodes: string[];
}

export function ResolveTimeline({ result, from, to, serviceCodes }: Props) {
  const navigate = useNavigate();
  const totalDays = dayjs(to).diff(dayjs(from), "day") + 1;
  if (serviceCodes.length === 0)
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select a service." />;
  const offset = (date: string) => (dayjs(date).diff(dayjs(from), "day") / totalDays) * 100;
  const width = (start: string, end: string) =>
    ((dayjs(end).diff(dayjs(start), "day") + 1) / totalDays) * 100;

  return (
    <div>
      <Flex justify="space-between" style={{ marginInlineStart: 160, fontSize: 12 }}>
        <Typography.Text type="secondary">{formatDate(from)}</Typography.Text>
        <Typography.Text type="secondary">{formatDate(to)}</Typography.Text>
      </Flex>
      {serviceCodes.map((code) => {
        const segments = result.segments.filter((segment) => segment.serviceCode === code);
        const gaps = result.gaps.filter((gap) => gap.serviceCode === code);
        return (
          <Flex
            key={code}
            align="center"
            gap={8}
            style={{ marginBottom: 8 }}
            data-testid={`resolve-row-${code}`}
          >
            <Typography.Text code style={{ width: 152, flexShrink: 0 }} ellipsis>
              {code}
            </Typography.Text>
            <div
              style={{
                position: "relative",
                flex: 1,
                height: 32,
                background: "#fafafa",
                borderRadius: 4,
              }}
            >
              {segments.map((segment) => (
                <Tooltip
                  key={`${segment.priceListId}-${segment.from}`}
                  title={`${formatMoney(segment.unitPrice, segment.currency)} · ${SCOPE_META[segment.scope].label} v${segment.priceListVersion} · ${formatDate(segment.from)} – ${formatDate(segment.to)}`}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/pricing/${segment.priceListId}`)}
                    style={{
                      position: "absolute",
                      left: `${offset(segment.from)}%`,
                      width: `${width(segment.from, segment.to)}%`,
                      top: 0,
                      bottom: 0,
                      border: "1px solid #fff",
                      borderRadius: 4,
                      background: SCOPE_BAR[segment.scope],
                      color: "#fff",
                      fontSize: 12,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      cursor: "pointer",
                      padding: "0 6px",
                    }}
                  >
                    {formatMoney(segment.unitPrice, segment.currency)} ·{" "}
                    {SCOPE_META[segment.scope].label} v{segment.priceListVersion}
                    {segment.sourceAddendumId ? " 📎" : ""}
                  </button>
                </Tooltip>
              ))}
              {gaps.map((gap) => (
                <Tooltip
                  key={`gap-${gap.from}`}
                  title={`Thiếu giá ${formatDate(gap.from)} – ${formatDate(gap.to)}`}
                >
                  <div
                    role="img"
                    aria-label={`Thiếu giá ${code}`}
                    style={{
                      position: "absolute",
                      left: `${offset(gap.from)}%`,
                      width: `${width(gap.from, gap.to)}%`,
                      top: 0,
                      bottom: 0,
                      borderRadius: 4,
                      background: GAP_BACKGROUND,
                      color: "#a8071a",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    THIẾU GIÁ
                  </div>
                </Tooltip>
              ))}
            </div>
          </Flex>
        );
      })}
      <Flex gap={16} wrap style={{ marginTop: 8, fontSize: 12 }}>
        <Typography.Text type="secondary">Chú giải:</Typography.Text>
        {SCOPE_PRIORITY.map((scope) => (
          <span key={scope}>
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: 2,
                background: SCOPE_BAR[scope],
                marginInlineEnd: 4,
                verticalAlign: "middle",
              }}
            />
            {SCOPE_META[scope].label}
          </span>
        ))}
        <span>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: 2,
              background: GAP_BACKGROUND,
              marginInlineEnd: 4,
              verticalAlign: "middle",
            }}
          />
          Thiếu giá
        </span>
      </Flex>
    </div>
  );
}

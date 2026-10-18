import { Tooltip, Typography } from "antd";

import { formatMoney, formatMoneyShort } from "@/shared/lib/format";

interface Props {
  value: number | string | null | undefined;
  currency?: string | null;
  short?: boolean;
  strong?: boolean;
}

export function MoneyText({ value, currency, short, strong }: Props) {
  const full = formatMoney(value, currency);
  const text = (
    <Typography.Text
      strong={strong}
      style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}
    >
      {short ? formatMoneyShort(value, currency) : full}
    </Typography.Text>
  );
  return short && full !== formatMoneyShort(value, currency) ? (
    <Tooltip title={full}>{text}</Tooltip>
  ) : (
    text
  );
}

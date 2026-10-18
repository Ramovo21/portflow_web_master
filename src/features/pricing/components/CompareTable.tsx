import { useState } from "react";
import { Alert, Flex, Select, Skeleton, Switch, Table, Tag, Typography } from "antd";

import { formatDate, formatMoney } from "@/shared/lib/format";
import { errorMessage } from "@/shared/lib/problem";

import type { Comparison, VersionItem } from "../api/priceLists";
import { useComparison } from "../hooks/usePricing";

type Line = Comparison["lines"][number];

interface Props {
  versions: VersionItem[];
  left?: string;
  right?: string;
  onChange(left: string | undefined, right: string | undefined): void;
  currency: string;
}

export function CompareTable({ versions, left, right, onChange, currency }: Props) {
  const [hideUnchanged, setHideUnchanged] = useState(false);
  const comparison = useComparison(left, right);
  const options = versions.map((v) => ({ value: v.id, label: `v${v.listVersion} · ${v.code}` }));
  const lines = (comparison.data?.lines ?? []).filter(
    (line) => !hideUnchanged || line.change !== "UNCHANGED",
  );
  const header = comparison.data?.headerChanges ?? {};

  return (
    <div>
      <Flex gap={8} wrap align="center" style={{ marginBottom: 12 }}>
        <Select
          style={{ minWidth: 220 }}
          value={left}
          options={options}
          onChange={(value) => onChange(value, right)}
          placeholder="Bản trái"
          aria-label="Bản trái"
        />
        <span>↔</span>
        <Select
          style={{ minWidth: 220 }}
          value={right}
          options={options}
          onChange={(value) => onChange(left, value)}
          placeholder="Bản phải"
          aria-label="Bản phải"
        />
        <Switch checked={hideUnchanged} onChange={setHideUnchanged} /> Ẩn dòng không đổi
      </Flex>
      {!left || !right || left === right ? (
        <Typography.Text type="secondary">Chọn hai version khác nhau để so sánh.</Typography.Text>
      ) : comparison.isLoading ? (
        <Skeleton active />
      ) : comparison.isError ? (
        <Alert type="error" showIcon title={errorMessage(comparison.error)} />
      ) : (
        <>
          {Object.entries(header).map(([field, [a, b]]) => (
            <Typography.Paragraph key={field} type="secondary" style={{ margin: "0 0 8px" }}>
              {field === "validFrom" ? "Hiệu lực từ" : field === "validTo" ? "Hiệu lực đến" : field}
              : {formatDate(a)} → {b ? formatDate(b) : "không thời hạn"}
            </Typography.Paragraph>
          ))}
          <Table<Line>
            rowKey="serviceCode"
            size="small"
            pagination={false}
            dataSource={lines}
            onRow={(line) => ({
              style:
                line.change === "UNCHANGED"
                  ? { opacity: 0.55 }
                  : line.change === "ADDED"
                    ? { background: "#f6ffed" }
                    : undefined,
            })}
            columns={[
              { title: "Dịch vụ", dataIndex: "serviceCode" },
              {
                title: comparison.data ? `v${comparison.data.left.listVersion}` : "Trái",
                dataIndex: "left",
                align: "right",
                render: (value: number | null, line) => (
                  <Typography.Text delete={line.change === "REMOVED"}>
                    {value === null ? "—" : formatMoney(value, currency)}
                  </Typography.Text>
                ),
              },
              {
                title: comparison.data ? `v${comparison.data.right.listVersion}` : "Phải",
                dataIndex: "right",
                align: "right",
                render: (value: number | null) =>
                  value === null ? "—" : formatMoney(value, currency),
              },
              {
                title: "Thay đổi",
                key: "change",
                render: (_, line) => {
                  if (line.change === "ADDED") return <Tag color="green">Mới</Tag>;
                  if (line.change === "REMOVED") return <Tag>Bỏ</Tag>;
                  if (line.change === "UNCHANGED")
                    return <Typography.Text type="secondary">Không đổi</Typography.Text>;
                  const pct = Number(line.deltaPct ?? 0);
                  return (
                    <Typography.Text type={pct < 0 ? "success" : "danger"} strong>
                      {pct < 0 ? "▼" : "▲"} {Math.abs(pct)}%
                    </Typography.Text>
                  );
                },
              },
            ]}
          />
        </>
      )}
    </div>
  );
}

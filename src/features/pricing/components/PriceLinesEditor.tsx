import {
  Alert,
  Button,
  Flex,
  Input,
  InputNumber,
  Select,
  Table,
  Typography,
  type SelectProps,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useServiceGroups, useServices } from "@/features/catalog/hooks/useCatalog";
import { uomLabel, type ServiceItem } from "@/features/catalog/api/catalog";
import { currencySuffix, formatMoney } from "@/shared/lib/format";

import type { PriceScope } from "../api/priceLists";
import { MONEY_INPUT, newLine, parseMoneyInput, type EditableLine } from "../lines";

interface Props {
  value: EditableLine[];
  onChange(lines: EditableLine[]): void;
  scope: PriceScope | undefined;
  serviceType: string | undefined;
  currency: string;

  errorCodes?: string[];

  reference?: Map<string, number>;

  previous?: Map<string, number>;
}

export function PriceLinesEditor({
  value,
  onChange,
  scope,
  serviceType,
  currency,
  errorCodes = [],
  reference,
  previous,
}: Props) {
  const services = useServices({ active: true });
  const groups = useServiceGroups();
  const all = services.data ?? [];
  const allowed =
    scope === "GLOBAL" ? all : all.filter((service) => service.groupCode === serviceType);
  const byCode = new Map(all.map((service) => [service.code, service]));
  const used = new Set(value.map((line) => line.serviceCode).filter(Boolean));
  const groupName = new Map((groups.data ?? []).map((group) => [group.code, group.name]));

  const optionsFor = (current?: string): SelectProps["options"] => {
    const toOption = (service: ServiceItem) => ({
      value: service.code,
      label: `${service.code} – ${service.name}`,
      disabled: used.has(service.code) && service.code !== current,
    });
    if (scope !== "GLOBAL") return allowed.map(toOption);
    const grouped = new Map<string, ServiceItem[]>();
    for (const service of allowed)
      grouped.set(service.groupCode, [...(grouped.get(service.groupCode) ?? []), service]);
    return [...grouped.entries()].map(([code, items]) => ({
      label: groupName.get(code) ?? code,
      title: code,
      options: items.map(toOption),
    }));
  };

  const patch = (key: string, change: Partial<EditableLine>) =>
    onChange(value.map((line) => (line.key === key ? { ...line, ...change } : line)));

  const addAll = () => {
    const missing = allowed
      .filter((service) => !used.has(service.code))
      .map((service) => newLine(service.code));
    onChange([...value.filter((line) => line.serviceCode), ...missing]);
  };

  const noGroup = scope !== "GLOBAL" && !serviceType;

  return (
    <div>
      <Flex justify="flex-end" gap={8} style={{ marginBottom: 8 }}>
        <Button
          icon={<PlusOutlined />}
          onClick={() => onChange([...value, newLine()])}
          disabled={noGroup}
        >
          Thêm dịch vụ
        </Button>
        <Button onClick={addAll} disabled={noGroup || allowed.length === 0}>
          Thêm tất cả dịch vụ của nhóm
        </Button>
      </Flex>
      {noGroup && (
        <Alert
          type="info"
          showIcon
          title="Select a service group before adding a price line."
          style={{ marginBottom: 8 }}
        />
      )}
      <Table<EditableLine>
        rowKey="key"
        size="small"
        pagination={false}
        dataSource={value}
        scroll={{ x: 760 }}
        loading={services.isLoading}
        locale={{ emptyText: "No price lines yet" }}
        onRow={(line) => ({
          style:
            line.serviceCode && errorCodes.includes(line.serviceCode)
              ? { background: "#fff1f0" }
              : undefined,
        })}
        columns={[
          {
            title: "Dịch vụ",
            key: "service",
            width: 300,
            render: (_, line) => (
              <Select
                showSearch={{ optionFilterProp: "label" }}
                value={line.serviceCode}
                placeholder="Select a service"
                options={optionsFor(line.serviceCode)}
                onChange={(code: string) => patch(line.key, { serviceCode: code })}
                style={{ width: "100%" }}
                aria-label="Dịch vụ"
                status={
                  line.serviceCode && errorCodes.includes(line.serviceCode) ? "error" : undefined
                }
              />
            ),
          },
          {
            title: "ĐVT",
            key: "uom",
            width: 110,
            render: (_, line) => {
              const service = line.serviceCode ? byCode.get(line.serviceCode) : undefined;
              return service ? (
                <span
                  title={`Theo danh mục: ${service.uom}`}
                  data-testid={`uom-${line.serviceCode}`}
                >
                  {uomLabel(service.uom)}
                </span>
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              );
            },
          },
          {
            title: `Đơn giá (${currencySuffix(currency)})`,
            key: "price",
            width: 200,
            render: (_, line) => {
              const hint = line.serviceCode ? reference?.get(line.serviceCode) : undefined;
              const before = line.serviceCode ? previous?.get(line.serviceCode) : undefined;
              const delta =
                before && line.unitPrice !== null && line.unitPrice !== undefined
                  ? ((line.unitPrice - before) * 100) / before
                  : undefined;
              return (
                <div>
                  <InputNumber<number>
                    min={0}
                    precision={2}
                    value={line.unitPrice ?? null}
                    onChange={(price) => patch(line.key, { unitPrice: price })}
                    formatter={(raw) =>
                      raw === undefined || raw === null ? "" : MONEY_INPUT.format(Number(raw))
                    }
                    parser={parseMoneyInput}
                    style={{ width: "100%" }}
                    aria-label={`Đơn giá ${line.serviceCode ?? ""}`}
                    status={
                      line.serviceCode && (line.unitPrice === null || line.unitPrice === undefined)
                        ? "warning"
                        : undefined
                    }
                  />
                  {hint !== undefined && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Giá niêm yết: {formatMoney(hint, currency)}
                    </Typography.Text>
                  )}
                  {delta !== undefined && Math.abs(delta) >= 0.01 && (
                    <div>
                      <Typography.Text
                        type={delta < 0 ? "success" : "danger"}
                        style={{ fontSize: 12 }}
                      >
                        {delta < 0 ? "▼" : "▲"} {Math.abs(Math.round(delta * 100) / 100)}% so với
                        bản trước
                      </Typography.Text>
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            title: "SL tối thiểu",
            key: "minQty",
            width: 120,
            render: (_, line) => (
              <InputNumber<number>
                min={0}
                precision={3}
                value={line.minQty ?? 0}
                onChange={(qty) => patch(line.key, { minQty: qty ?? 0 })}
                style={{ width: "100%" }}
                aria-label="SL tối thiểu"
              />
            ),
          },
          {
            title: "Ghi chú",
            key: "note",
            render: (_, line) => (
              <Input
                value={line.note ?? ""}
                onChange={(event) => patch(line.key, { note: event.target.value })}
                maxLength={500}
              />
            ),
          },
          {
            key: "remove",
            width: 48,
            render: (_, line) => (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Xóa dòng ${line.serviceCode ?? ""}`}
                onClick={() => onChange(value.filter((item) => item.key !== line.key))}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

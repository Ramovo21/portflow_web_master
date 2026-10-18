import {
  Alert,
  Button,
  Card,
  DatePicker,
  Flex,
  Form,
  Select,
  Skeleton,
  Table,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { Link, useSearchParams } from "react-router-dom";

import { useServices } from "@/features/catalog/hooks/useCatalog";
import { DateText } from "@/shared/components/data/DateText";
import { MoneyText } from "@/shared/components/data/MoneyText";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { PageHeader } from "@/shared/components/page/PageHeader";
import { todayIso } from "@/shared/lib/format";

import { uomLabel } from "@/features/catalog/api/catalog";
import type { PriceSegment } from "../api/priceLists";
import { PriorityContent } from "../components/PriorityExplainer";
import { ResolveTimeline } from "../components/ResolveTimeline";
import { ContractSelect } from "../components/ScopeTargetSelect";
import { ScopeTag } from "../components/ScopeTag";
import { useContractTarget, useResolve } from "../hooks/usePricing";

export const MAX_PERIOD_DAYS = 366;

export function PriceResolvePage() {
  const [params, setParams] = useSearchParams();
  const contractId = params.get("contractId");
  const today = dayjs(todayIso());
  const from = params.get("from") ?? today.startOf("month").format("YYYY-MM-DD");
  const to = params.get("to") ?? today.endOf("month").format("YYYY-MM-DD");
  const chosenCodes = params.getAll("serviceCode");
  const contract = useContractTarget(contractId);
  const services = useServices({});
  const contractCodes = (contract.data?.services ?? []).map((service) => service.serviceCode);
  const codes = chosenCodes.length > 0 ? chosenCodes : contractCodes;
  const tooLong = dayjs(to).diff(dayjs(from), "day") + 1 > MAX_PERIOD_DAYS;
  const submitted = params.get("run") === "1" && !!contractId && !tooLong;
  const resolve = useResolve(
    submitted ? { contractId: contractId!, serviceCodes: codes, from, to } : null,
  );

  const update = (patch: Record<string, string | string[] | undefined>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          next.delete(key);
          if (Array.isArray(value)) value.forEach((item) => next.append(key, item));
          else if (value) next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );

  const setRange = (start: Dayjs, end: Dayjs) =>
    update({ from: start.format("YYYY-MM-DD"), to: end.format("YYYY-MM-DD") });

  const gapServices = [...new Set((resolve.data?.gaps ?? []).map((gap) => gap.serviceCode))];

  return (
    <>
      <PageHeader
        title="Xem trước đơn giá"
        subtitle="Đơn giá áp dụng cho hợp đồng theo từng ngày, lấy từ bảng giá nào."
      />
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Flex gap={16} wrap>
            <Form.Item label="Hợp đồng" required style={{ minWidth: 320, flex: 1 }}>
              <ContractSelect
                value={contractId}
                onChange={(value) =>
                  update({ contractId: value ?? undefined, serviceCode: undefined, run: undefined })
                }
              />
            </Form.Item>
            <Form.Item
              label="Dịch vụ"
              style={{ minWidth: 320, flex: 1 }}
              extra={
                chosenCodes.length === 0 && contractId
                  ? "Mặc định: dịch vụ của hợp đồng"
                  : undefined
              }
            >
              <Select
                mode="multiple"
                allowClear
                value={chosenCodes.length > 0 ? chosenCodes : contractCodes}
                onChange={(value: string[]) => update({ serviceCode: value, run: undefined })}
                options={(services.data ?? []).map((service) => ({
                  value: service.code,
                  label: `${service.code} – ${service.name}`,
                }))}
                placeholder="Select a service"
                aria-label="Dịch vụ"
              />
            </Form.Item>
          </Flex>
          <Flex gap={8} wrap align="flex-end">
            <Form.Item
              label="Kỳ"
              required
              validateStatus={tooLong ? "error" : undefined}
              help={tooLong ? `Tối đa ${MAX_PERIOD_DAYS} ngày` : undefined}
            >
              <DatePicker.RangePicker
                format="DD/MM/YYYY"
                value={[dayjs(from), dayjs(to)]}
                onChange={(range) => range?.[0] && range[1] && setRange(range[0], range[1])}
                allowClear={false}
              />
            </Form.Item>
            <Form.Item>
              <Button onClick={() => setRange(today.startOf("month"), today.endOf("month"))}>
                Tháng này
              </Button>
            </Form.Item>
            <Form.Item>
              <Button
                onClick={() => {
                  const last = today.subtract(1, "month");
                  setRange(last.startOf("month"), last.endOf("month"));
                }}
              >
                Tháng trước
              </Button>
            </Form.Item>
            <Form.Item style={{ marginInlineStart: "auto" }}>
              <Button
                type="primary"
                disabled={!contractId || codes.length === 0 || tooLong}
                onClick={() => update({ run: "1" })}
              >
                Xem đơn giá
              </Button>
            </Form.Item>
          </Flex>
        </Form>
      </Card>

      {!submitted ? (
        <Card size="small" title="Giá được chọn thế nào?">
          <PriorityContent />
        </Card>
      ) : resolve.isLoading ? (
        <Skeleton active />
      ) : resolve.isError ? (
        <ProblemAlert error={resolve.error} />
      ) : resolve.data ? (
        <Card size="small" title="Kết quả">
          {gapServices.length > 0 && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              title={`${gapServices.length} dịch vụ thiếu giá trong kỳ – bảng thanh toán sẽ không lập được (PAY_PRICE_NOT_FOUND).`}
              description={gapServices.join(", ")}
              action={
                <Link to={`/pricing/new?scope=CONTRACT&scopeId=${contractId}`}>
                  <Button size="small">Tạo bảng giá HĐ</Button>
                </Link>
              }
            />
          )}
          <ResolveTimeline result={resolve.data} from={from} to={to} serviceCodes={codes} />
          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Chi tiết
          </Typography.Title>
          <Table<PriceSegment>
            rowKey={(segment) => `${segment.serviceCode}-${segment.from}`}
            size="small"
            pagination={false}
            dataSource={resolve.data.segments}
            scroll={{ x: 760 }}
            columns={[
              {
                title: "Dịch vụ",
                dataIndex: "serviceCode",
                render: (code: string) => <Typography.Text code>{code}</Typography.Text>,
              },
              {
                title: "Từ",
                dataIndex: "from",
                render: (value: string) => <DateText value={value} />,
              },
              {
                title: "Đến",
                dataIndex: "to",
                render: (value: string) => <DateText value={value} />,
              },
              {
                title: "Đơn giá",
                dataIndex: "unitPrice",
                align: "right",
                render: (price: number, segment) => (
                  <MoneyText value={price} currency={segment.currency} />
                ),
              },
              { title: "ĐVT", dataIndex: "uom", render: (uom: string) => uomLabel(uom) },
              {
                title: "Nguồn",
                key: "source",
                render: (_, segment) => (
                  <Link to={`/pricing/${segment.priceListId}`}>
                    Bảng giá v{segment.priceListVersion}
                    {segment.sourceAddendumId ? " 📎" : ""}
                  </Link>
                ),
              },
              {
                title: "Phạm vi",
                dataIndex: "scope",
                render: (scope: PriceSegment["scope"]) => <ScopeTag scope={scope} />,
              },
            ]}
          />
        </Card>
      ) : null}
    </>
  );
}

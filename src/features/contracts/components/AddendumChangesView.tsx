import { Alert, Table, Tag, Typography } from "antd";

import { formatDate, formatMoney } from "@/shared/lib/format";

import type { AddendumType } from "../api/addenda";
import type { ContractResponse } from "../api/contracts";
import type { ServiceItem } from "../api/lookups";
import { deltaPct, type AddendumDraft } from "../lib/addendumPayload";
import { paymentMethodLabel, SCOPE_LABELS } from "../lib/labels";

interface Props {
  draft: AddendumDraft;
  contract: ContractResponse;
  catalog?: ServiceItem[];

  currentPrices?: Record<string, { unitPrice: number; scope: string } | undefined>;

  applied?: boolean;
}

interface Row {
  key: string;
  label: string;
  before?: React.ReactNode;
  after: React.ReactNode;
}

export function AddendumChangesView({
  draft,
  contract,
  catalog = [],
  currentPrices = {},
  applied,
}: Props) {
  const currency = contract.value.currency;
  const terms = contract.currentTerms;
  const rows: Row[] = [];
  const type: AddendumType = draft.type;

  if (type === "EXTENSION") {
    rows.push({
      key: "end",
      label: "Ngày kết thúc",
      before: formatDate(contract.effectiveTo),
      after: <b>{formatDate(draft.newEffectiveTo)}</b>,
    });
    if (contract.status === "EXPIRED") {
      rows.push({
        key: "status",
        label: "Status",
        before: "Hết hạn",
        after: <Tag color="success">Đang hiệu lực</Tag>,
      });
    }
  } else if (type === "PAYMENT_TERMS") {
    rows.push(
      {
        key: "days",
        label: "Số ngày thanh toán",
        before: terms?.paymentDays ?? contract.paymentTerms.paymentDays,
        after: <b>{draft.paymentDays}</b>,
      },
      {
        key: "method",
        label: "Phương thức",
        before: paymentMethodLabel(terms?.paymentMethod ?? contract.paymentTerms.method),
        after: <b>{paymentMethodLabel(draft.paymentMethod)}</b>,
      },
      {
        key: "note",
        label: "Ghi chú",
        before: (terms?.paymentNote ?? contract.paymentTerms.note) || "—",
        after: draft.paymentNote || "—",
      },
    );
  } else if (type === "PRICE_CHANGE") {
    for (const [code, price] of Object.entries(draft.prices ?? {})) {
      if (price === null || price === undefined) continue;
      const current = currentPrices[code];
      const delta = deltaPct(current?.unitPrice, price);
      rows.push({
        key: code,
        label: `${code}${catalog.find((service) => service.code === code) ? ` · ${catalog.find((service) => service.code === code)!.name}` : ""}`,
        before: current ? (
          <span>
            {formatMoney(current.unitPrice, currency)}{" "}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              ({SCOPE_LABELS[current.scope] ?? current.scope})
            </Typography.Text>
          </span>
        ) : (
          "No price yet"
        ),
        after: (
          <span>
            <b>{formatMoney(price, currency)}</b>
            {delta !== undefined && (
              <Typography.Text
                type={delta < -10 ? "danger" : "secondary"}
                style={{ marginInlineStart: 6 }}
              >
                {delta > 0 ? "+" : ""}
                {delta.toLocaleString("vi-VN")}%
              </Typography.Text>
            )}
          </span>
        ),
      });
    }
  } else {
    for (const service of draft.services ?? []) {
      rows.push({
        key: service.serviceCode,
        label: `${service.serviceCode}${catalog.find((item) => item.code === service.serviceCode) ? ` · ${catalog.find((item) => item.code === service.serviceCode)!.name}` : ""}`,
        before: "None yet",
        after: (
          <span>
            Áp dụng{service.mandatory ? <Tag style={{ marginInlineStart: 6 }}>Bắt buộc</Tag> : null}
          </span>
        ),
      });
    }
  }

  return (
    <>
      <Table<Row>
        size="small"
        pagination={false}
        rowKey="key"
        dataSource={rows}
        locale={{ emptyText: "No changes yet." }}
        columns={[
          { title: "Mục", dataIndex: "label" },
          ...(applied ? [] : [{ title: "Hiện tại", dataIndex: "before" }]),
          {
            title: applied
              ? `Từ ${formatDate(draft.effectiveFrom)}`
              : `Sau khi áp dụng từ ${formatDate(draft.effectiveFrom)}`,
            dataIndex: "after",
          },
        ]}
      />
      {type === "PRICE_CHANGE" && !applied && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 12 }}
          title="Khi phụ lục được áp dụng, hệ thống tạo bảng giá hợp đồng version mới từ ngày hiệu lực (F05)."
        />
      )}
    </>
  );
}

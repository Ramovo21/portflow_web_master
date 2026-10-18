import { Button, Checkbox, Table, Tag, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import { DateText } from "@/shared/components/data/DateText";

import type { ServiceGroup, ServiceItem } from "../api/lookups";

export interface ServiceRow {
  serviceCode: string;
  mandatory: boolean;
  validFrom?: string | null;
  sourceAddendumId?: string | null;
}

interface Props {
  rows: ServiceRow[];
  catalog: ServiceItem[];
  groups: ServiceGroup[];

  onChange?(rows: ServiceRow[]): void;

  invalidCodes?: string[];
}

export function ServicesTable({ rows, catalog, groups, onChange, invalidCodes = [] }: Props) {
  const editable = !!onChange;
  const info = (code: string) => catalog.find((service) => service.code === code);
  const groupName = (code: string | undefined) =>
    groups.find((group) => group.code === code)?.name ?? code ?? "—";

  return (
    <Table<ServiceRow>
      rowKey="serviceCode"
      size="small"
      pagination={false}
      dataSource={rows}
      locale={{
        emptyText: editable
          ? "No services yet – click “Thêm dịch vụ”."
          : "This contract has no services yet.",
      }}
      rowClassName={(row) => (invalidCodes.includes(row.serviceCode) ? "ant-table-row-error" : "")}
      columns={[
        {
          title: "Mã",
          dataIndex: "serviceCode",
          render: (code: string) => (
            <Typography.Text code type={invalidCodes.includes(code) ? "danger" : undefined}>
              {code}
            </Typography.Text>
          ),
        },
        { title: "Tên", key: "name", render: (_, row) => info(row.serviceCode)?.name ?? "—" },
        {
          title: "Nhóm",
          key: "group",
          responsive: ["md"],
          render: (_, row) => groupName(info(row.serviceCode)?.groupCode),
        },
        { title: "ĐVT", key: "uom", render: (_, row) => info(row.serviceCode)?.uom ?? "—" },
        {
          title: "Bắt buộc",
          dataIndex: "mandatory",
          align: "center",
          render: (mandatory: boolean, row) =>
            editable ? (
              <Checkbox
                aria-label={`Bắt buộc ${row.serviceCode}`}
                checked={mandatory}
                onChange={(event) =>
                  onChange!(
                    rows.map((item) =>
                      item.serviceCode === row.serviceCode
                        ? { ...item, mandatory: event.target.checked }
                        : item,
                    ),
                  )
                }
              />
            ) : mandatory ? (
              "Có"
            ) : (
              "Không"
            ),
        },
        ...(editable
          ? [
              {
                title: "",
                key: "remove",
                width: 48,
                render: (_: unknown, row: ServiceRow) => (
                  <Button
                    type="text"
                    danger
                    aria-label={`Xóa ${row.serviceCode}`}
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      onChange!(rows.filter((item) => item.serviceCode !== row.serviceCode))
                    }
                  />
                ),
              },
            ]
          : [
              {
                title: "Từ ngày",
                key: "validFrom",
                render: (_: unknown, row: ServiceRow) =>
                  row.validFrom ? (
                    <DateText value={row.validFrom} />
                  ) : (
                    <Typography.Text type="secondary">Từ đầu HĐ</Typography.Text>
                  ),
              },
              {
                title: "Nguồn",
                key: "source",
                render: (_: unknown, row: ServiceRow) =>
                  row.sourceAddendumId ? (
                    <Link to={`/addenda/${row.sourceAddendumId}`}>
                      <Tag color="green">Phụ lục</Tag>
                    </Link>
                  ) : (
                    "Gốc"
                  ),
              },
            ]),
      ]}
    />
  );
}

import { Button, Table, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { DateText } from "@/shared/components/data/DateText";
import { StatusTag } from "@/shared/components/status/StatusTag";

import type { AddendumResponse } from "../api/addenda";
import { addendumSummary } from "../lib/addendumPayload";
import { ADDENDUM_TYPES } from "../lib/labels";

interface Props {
  addenda: AddendumResponse[];
  loading?: boolean;
  currency: string;
  onCreate?(): void;
}

export function AddendaTab({ addenda, loading, currency, onCreate }: Props) {
  const navigate = useNavigate();
  return (
    <>
      {onCreate && (
        <Button icon={<PlusOutlined />} onClick={onCreate} style={{ marginBottom: 12 }}>
          Tạo phụ lục
        </Button>
      )}
      <Table<AddendumResponse>
        rowKey="id"
        size="small"
        loading={loading}
        pagination={false}
        dataSource={addenda}
        locale={{ emptyText: "No addenda yet." }}
        rowClassName="pf-clickable-row"
        onRow={(row) => ({ onClick: () => navigate(`/addenda/${row.id}`) })}
        columns={[
          { title: "Số phụ lục", dataIndex: "number" },
          {
            title: "Loại",
            dataIndex: "type",
            render: (type: AddendumResponse["type"]) => (
              <Tag color={ADDENDUM_TYPES[type].color}>{ADDENDUM_TYPES[type].label}</Tag>
            ),
          },
          {
            title: "Hiệu lực",
            dataIndex: "effectiveFrom",
            render: (value: string) => <DateText value={value} />,
          },
          {
            title: "Thay đổi",
            key: "summary",
            render: (_, row) => addendumSummary(row.type, row.changes, currency),
          },
          {
            title: "Status",
            dataIndex: "status",
            render: (status: string) => <StatusTag kind="ADDENDUM" status={status} />,
          },
        ]}
      />
    </>
  );
}

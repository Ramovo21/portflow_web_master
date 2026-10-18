import { useState } from "react";
import { Card, Table, Tag, Typography } from "antd";

import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { PageHeader } from "@/shared/components/page/PageHeader";

import type { DocumentType } from "../api/identity";
import { DocumentTypeDrawer } from "../components/DocumentTypeDrawer";
import { useDocumentTypeList } from "../hooks/useIdentityAdmin";

export function DocumentTypePage() {
  const documentTypes = useDocumentTypeList();
  const [selected, setSelected] = useState<DocumentType>();

  return (
    <>
      <PageHeader
        title="Loại hồ sơ"
        subtitle="Loại hồ sơ đi qua quy trình duyệt: quy trình áp dụng, có cần ký số và điều kiện khi gửi duyệt."
      />
      <Card size="small">
        {documentTypes.isError ? (
          <ProblemAlert error={documentTypes.error} />
        ) : (
          <Table<DocumentType>
            rowKey="code"
            size="middle"
            loading={documentTypes.isLoading}
            dataSource={documentTypes.data ?? []}
            pagination={false}
            scroll={{ x: 640 }}
            onRow={(type) => ({ onClick: () => setSelected(type), style: { cursor: "pointer" } })}
            columns={[
              {
                title: "Loại hồ sơ",
                key: "type",
                render: (_, type) => (
                  <>
                    <Typography.Text strong>{type.name}</Typography.Text>{" "}
                    <Typography.Text type="secondary" code>
                      {type.code}
                    </Typography.Text>
                  </>
                ),
              },
              {
                title: "Quy trình",
                dataIndex: "workflowKey",
                render: (key: string) => <Typography.Text code>{key}</Typography.Text>,
              },
              {
                title: "Ký số",
                dataIndex: "requiresESign",
                render: (value: boolean) =>
                  value ? <Tag color="purple">Cần ký số</Tag> : <Tag>Không</Tag>,
              },
              {
                title: "Trạng thái",
                dataIndex: "active",
                render: (value: boolean) =>
                  value ? <Tag color="success">Đang dùng</Tag> : <Tag>Ngừng dùng</Tag>,
              },
            ]}
          />
        )}
      </Card>
      {selected && <DocumentTypeDrawer type={selected} onClose={() => setSelected(undefined)} />}
    </>
  );
}

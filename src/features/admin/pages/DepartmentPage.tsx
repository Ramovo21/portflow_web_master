import { useMemo, useState } from "react";
import { Button, Card, Table, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { PageHeader } from "@/shared/components/page/PageHeader";

import type { Department } from "../api/identity";
import { DepartmentDrawer } from "../components/DepartmentDrawer";
import { useDepartments, useUsers } from "../hooks/useIdentityAdmin";

export function DepartmentPage() {
  const departments = useDepartments();
  const users = useUsers({ active: true });
  const [editing, setEditing] = useState<Department | "new">();

  const userNames = useMemo(
    () => new Map((users.data ?? []).map((user) => [user.id, user.fullName])),
    [users.data],
  );
  const departmentNames = useMemo(
    () => new Map((departments.data ?? []).map((department) => [department.id, department.name])),
    [departments.data],
  );
  const empty = <Typography.Text type="secondary">—</Typography.Text>;

  return (
    <>
      <PageHeader
        title="Phòng ban"
        subtitle="Mã phòng ban phải trùng thuộc tính department của người dùng trong Keycloak. Trưởng phòng được dùng làm người duyệt ở các bước 'Trưởng phòng'."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing("new")}>
            Thêm phòng ban
          </Button>
        }
      />
      <Card size="small">
        {departments.isError ? (
          <ProblemAlert error={departments.error} />
        ) : (
          <Table<Department>
            rowKey="id"
            size="middle"
            loading={departments.isLoading}
            dataSource={departments.data ?? []}
            pagination={false}
            scroll={{ x: 640 }}
            locale={{ emptyText: "Chưa có phòng ban" }}
            onRow={(department) => ({
              onClick: () => setEditing(department),
              style: { cursor: "pointer" },
            })}
            columns={[
              {
                title: "Mã",
                dataIndex: "code",
                width: 120,
                render: (code: string) => <Typography.Text code>{code}</Typography.Text>,
              },
              { title: "Tên phòng ban", dataIndex: "name" },
              {
                title: "Trưởng phòng",
                dataIndex: "headUserId",
                render: (id: string | null) => (id ? (userNames.get(id) ?? id) : empty),
              },
              {
                title: "Trực thuộc",
                dataIndex: "parentId",
                responsive: ["md"],
                render: (id: string | null) => (id ? (departmentNames.get(id) ?? id) : empty),
              },
            ]}
          />
        )}
      </Card>
      {editing && (
        <DepartmentDrawer
          department={editing === "new" ? undefined : editing}
          departments={departments.data ?? []}
          users={users.data ?? []}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}

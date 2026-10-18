import { useState } from "react";
import { Card, Flex, Table, Tag, Tooltip, Typography } from "antd";
import { LockOutlined } from "@ant-design/icons";

import { dataScopeLabel, roleLabel } from "@/features/auth/labels";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { PageHeader } from "@/shared/components/page/PageHeader";

import type { Role } from "../api/identity";
import { RoleDrawer } from "../components/RoleDrawer";
import { useRoles } from "../hooks/useIdentityAdmin";

export function RolePage() {
  const roles = useRoles();
  const [selected, setSelected] = useState<Role>();

  return (
    <>
      <PageHeader
        title="Vai trò & quyền"
        subtitle="Vai trò trùng tên realm role trong Keycloak. Quyền và phạm vi dữ liệu của từng vai trò do PortFlow quản lý; vai trò hệ thống chỉ xem."
      />
      <Card size="small">
        {roles.isError ? (
          <ProblemAlert error={roles.error} />
        ) : (
          <Table<Role>
            rowKey="code"
            size="middle"
            loading={roles.isLoading}
            dataSource={roles.data ?? []}
            pagination={false}
            scroll={{ x: 640 }}
            onRow={(role) => ({ onClick: () => setSelected(role), style: { cursor: "pointer" } })}
            columns={[
              {
                title: "Vai trò",
                key: "role",
                render: (_, role) => (
                  <Flex vertical>
                    <Flex gap={6} align="center">
                      <Typography.Text strong>{role.name}</Typography.Text>
                      {role.system && (
                        <Tooltip title="Vai trò hệ thống – không sửa được qua giao diện">
                          <LockOutlined aria-label="Vai trò hệ thống" />
                        </Tooltip>
                      )}
                    </Flex>
                    <Typography.Text type="secondary" code>
                      {role.code}
                    </Typography.Text>
                  </Flex>
                ),
              },
              {
                title: "Phạm vi dữ liệu",
                dataIndex: "dataScope",
                render: (scope: Role["dataScope"]) => (
                  <Tag color={scope === "ALL" ? "geekblue" : "default"}>
                    {dataScopeLabel(scope)}
                  </Tag>
                ),
              },
              {
                title: "Quyền",
                dataIndex: "permissions",
                render: (permissions: string[]) => `${permissions.length} quyền`,
              },
              {
                title: "Ghi chú",
                key: "note",
                responsive: ["lg"],
                render: (_, role) =>
                  role.code === "ADMIN" ? (
                    <Typography.Text type="secondary">
                      Không có quyền duyệt (tách quyền)
                    </Typography.Text>
                  ) : role.permissions.includes("Workflow.Act") ? (
                    <Typography.Text type="secondary">
                      Tham gia duyệt ({roleLabel(role.code)})
                    </Typography.Text>
                  ) : null,
              },
            ]}
          />
        )}
      </Card>
      {selected && <RoleDrawer role={selected} onClose={() => setSelected(undefined)} />}
    </>
  );
}

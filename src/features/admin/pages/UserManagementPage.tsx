import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Flex,
  Input,
  Segmented,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { SyncOutlined, WarningOutlined } from "@ant-design/icons";

import { roleLabel } from "@/features/auth";
import { DateTimeText, RelativeTime } from "@/shared/components/data/DateText";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { FilterBar } from "@/shared/components/page/FilterBar";
import { PageHeader } from "@/shared/components/page/PageHeader";
import { errorMessage } from "@/shared/lib/problem";

import type { UserFilter, UserRow } from "../api/identity";
import { useDepartments, useRoles, useSyncUsers, useUsers } from "../hooks/useIdentityAdmin";
import { keycloakUsersConsoleUrl } from "../lib/keycloak";
import { SYNC_SOURCE_LABELS } from "../lib/labels";

type ActiveView = "active" | "inactive" | "all";

const ACTIVE_FILTER: Record<ActiveView, boolean | undefined> = {
  active: true,
  inactive: false,
  all: undefined,
};

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function UserManagementPage() {
  const { message, notification } = App.useApp();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>();
  const [role, setRole] = useState<string>();
  const [view, setView] = useState<ActiveView>("active");
  const q = useDebounced(search.trim());

  const filter: UserFilter = { q, departmentId, role, active: ACTIVE_FILTER[view] };
  const users = useUsers(filter);
  const departments = useDepartments();
  const roles = useRoles();
  const sync = useSyncUsers();

  const hasFilters = !!q || !!departmentId || !!role || view !== "active";
  const sodCount = useMemo(
    () => (users.data ?? []).filter((user) => user.sodViolation && user.active).length,
    [users.data],
  );

  const runSync = () =>
    sync.mutate(undefined, {
      onSuccess: (result) =>
        message.success(
          `Đã đồng bộ ${result.synced} người dùng từ Keycloak` +
            (result.deactivated > 0
              ? `, vô hiệu hóa ${result.deactivated} tài khoản không còn tồn tại`
              : ""),
        ),
      onError: (error) =>
        notification.error({ title: "Đồng bộ thất bại", description: errorMessage(error) }),
    });

  return (
    <>
      <PageHeader
        title="Người dùng"
        subtitle="Bản sao người dùng từ Keycloak: vai trò, phòng ban và trạng thái đồng bộ. Tạo tài khoản, gán vai trò và phòng ban thực hiện trong Keycloak (đăng nhập bằng tài khoản quản trị Keycloak)."
        extra={
          <>
            <Button href={keycloakUsersConsoleUrl()} target="_blank" rel="noopener">
              Mở Keycloak ↗
            </Button>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              loading={sync.isPending}
              onClick={runSync}
            >
              Đồng bộ từ Keycloak
            </Button>
          </>
        }
      />

      {sodCount > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${sodCount} tài khoản vi phạm tách quyền (vừa là Quản trị vừa có vai trò duyệt)`}
          description="Các tài khoản này bị chặn quyền duyệt (Workflow.Act). Gỡ vai trò Quản trị hoặc vai trò duyệt trong Keycloak rồi đồng bộ lại."
        />
      )}

      <FilterBar
        total={users.data?.length}
        hasFilters={hasFilters}
        onClear={() => {
          setSearch("");
          setDepartmentId(undefined);
          setRole(undefined);
          setView("active");
        }}
      >
        <Input.Search
          allowClear
          placeholder="Tên đăng nhập, họ tên…"
          style={{ width: 240 }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          allowClear
          placeholder="Phòng ban"
          style={{ width: 200 }}
          value={departmentId}
          onChange={setDepartmentId}
          loading={departments.isLoading}
          options={(departments.data ?? []).map((department) => ({
            value: department.id,
            label: `${department.name} (${department.code})`,
          }))}
        />
        <Select
          allowClear
          placeholder="Vai trò"
          style={{ width: 180 }}
          value={role}
          onChange={setRole}
          loading={roles.isLoading}
          options={(roles.data ?? []).map((item) => ({
            value: item.code,
            label: roleLabel(item.code),
          }))}
        />
        <Segmented<ActiveView>
          value={view}
          onChange={setView}
          options={[
            { value: "active", label: "Đang hoạt động" },
            { value: "inactive", label: "Đã vô hiệu hóa" },
            { value: "all", label: "Tất cả" },
          ]}
        />
      </FilterBar>

      {users.isError ? (
        <ProblemAlert error={users.error} />
      ) : (
        <Table<UserRow>
          rowKey="id"
          size="middle"
          loading={users.isFetching}
          dataSource={users.data ?? []}
          pagination={(users.data?.length ?? 0) > 20 ? { pageSize: 20 } : false}
          scroll={{ x: 900 }}
          locale={{
            emptyText: hasFilters ? "Không có người dùng theo bộ lọc" : "Chưa có người dùng",
          }}
          columns={[
            {
              title: "Người dùng",
              key: "user",
              render: (_, user) => (
                <Flex vertical>
                  <Typography.Text strong>{user.fullName}</Typography.Text>
                  <Typography.Text type="secondary">
                    {user.username}
                    {user.email ? ` · ${user.email}` : ""}
                  </Typography.Text>
                </Flex>
              ),
            },
            {
              title: "Phòng ban",
              key: "department",
              render: (_, user) =>
                user.departmentName ? (
                  user.departmentName
                ) : (
                  <Tooltip title="Chưa có thuộc tính department hợp lệ trong Keycloak – chưa dùng được PortFlow">
                    <Tag color="warning">Chưa gán phòng ban</Tag>
                  </Tooltip>
                ),
            },
            {
              title: "Vai trò",
              dataIndex: "roles",
              render: (roleCodes: string[]) => (
                <Flex wrap gap={4}>
                  {roleCodes.map((code) => (
                    <Tag key={code} color="blue">
                      {roleLabel(code)}
                    </Tag>
                  ))}
                </Flex>
              ),
            },
            {
              title: "Trạng thái",
              key: "status",
              render: (_, user) => (
                <Flex wrap gap={4}>
                  {user.active ? <Tag color="success">Hoạt động</Tag> : <Tag>Vô hiệu hóa</Tag>}
                  {user.sodViolation && (
                    <Tooltip title="Vừa là Quản trị vừa có vai trò duyệt – bị chặn quyền duyệt">
                      <Tag color="error" icon={<WarningOutlined />}>
                        Vi phạm tách quyền
                      </Tag>
                    </Tooltip>
                  )}
                </Flex>
              ),
            },
            {
              title: "Đồng bộ",
              key: "sync",
              responsive: ["lg"],
              render: (_, user) => (
                <Flex vertical>
                  <span>
                    {user.syncSource
                      ? (SYNC_SOURCE_LABELS[user.syncSource] ?? user.syncSource)
                      : "—"}
                  </span>
                  <Typography.Text type="secondary">
                    <DateTimeText value={user.syncedAt} />
                  </Typography.Text>
                </Flex>
              ),
            },
            {
              title: "Lần cuối truy cập",
              dataIndex: "lastSeenAt",
              responsive: ["md"],
              render: (value: string | null) =>
                value ? (
                  <RelativeTime value={value} />
                ) : (
                  <Typography.Text type="secondary">Chưa đăng nhập</Typography.Text>
                ),
            },
          ]}
        />
      )}
    </>
  );
}

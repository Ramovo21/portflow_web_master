import { useMemo, useState } from "react";
import { Alert, Flex, Input, Radio, Select, Space, Typography } from "antd";

import { roleLabel } from "@/features/auth";

import type { AssigneeRule, AssigneeType } from "../api/definitions";
import { useRoles, useUserSearch, useUsersOfRole } from "../hooks/useDefinitions";
import { ASSIGNEE_TYPE_LABELS, DYNAMIC_EXPRESSIONS } from "../lib/labels";

const ACT_PERMISSION = "Workflow.Act";

interface Props {
  value: AssigneeRule;
  onChange(value: AssigneeRule): void;
  disabled?: boolean;

  status?: "error";
}

function emptyRule(type: AssigneeType): AssigneeRule {
  return {
    type,
    value: type === "DYNAMIC" ? DYNAMIC_EXPRESSIONS[0]!.value : null,
    scope: "ANY",
    userIds: [],
  };
}

function RoleHolders({ role, sameDepartment }: { role: string | null; sameDepartment: boolean }) {
  const holders = useUsersOfRole(role);
  if (!role || holders.isLoading || holders.isError) return null;
  const people = holders.data ?? [];
  if (people.length === 0) {
    return (
      <Typography.Text type="warning" style={{ fontSize: 12 }}>
        Hiện không có người dùng hoạt động – gửi duyệt sẽ lỗi WF_NO_ASSIGNEE.
      </Typography.Text>
    );
  }
  return (
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      Hiện có: {people.map((person) => person.fullName).join(", ")}
      {sameDepartment && " (lọc theo phòng của người gửi lúc chạy)"}
    </Typography.Text>
  );
}

function UserSelect({
  mode,
  value,
  onChange,
  disabled,
  status,
}: {
  mode?: "multiple";
  value: string | string[] | null;
  onChange(value: string | string[] | null): void;
  disabled?: boolean;
  status?: "error";
}) {
  const [q, setQ] = useState("");
  const users = useUserSearch(q, !disabled);
  if (users.isError) {
    return (
      <Space orientation="vertical" style={{ width: "100%" }} size={4}>
        <Input
          disabled={disabled}
          status={status}
          placeholder={mode ? "Id người dùng, cách nhau bởi dấu phẩy" : "Id người dùng (UUID)"}
          value={Array.isArray(value) ? value.join(", ") : (value ?? "")}
          onChange={(event) => {
            const text = event.target.value;
            onChange(
              mode
                ? text
                    .split(",")
                    .map((part) => part.trim())
                    .filter(Boolean)
                : text.trim() || null,
            );
          }}
        />
        <Typography.Text type="warning" style={{ fontSize: 12 }}>
          Không tải được danh sách người dùng (cần quyền User.Admin) – nhập id thủ công.
        </Typography.Text>
      </Space>
    );
  }
  return (
    <Select
      mode={mode}
      showSearch
      filterOption={false}
      onSearch={setQ}
      disabled={disabled}
      status={status}
      loading={users.isFetching}
      placeholder="Tìm theo tên / username"
      style={{ width: "100%" }}
      value={value ?? undefined}
      onChange={(next) => onChange((next as string | string[] | undefined) ?? null)}
      options={(users.data ?? [])
        .filter((user) => user.active)
        .map((user) => ({
          value: user.id,
          label: `${user.fullName} (${user.username}${user.departmentCode ? ` · ${user.departmentCode}` : ""})`,
        }))}
    />
  );
}

export function AssigneePicker({ value, onChange, disabled, status }: Props) {
  const roles = useRoles();
  const [groupByRole, setGroupByRole] = useState(
    value.type === "GROUP" && value.userIds.length === 0 && !!value.value,
  );
  const roleOptions = useMemo(
    () =>
      (roles.data ?? [])
        .filter((role) => role.permissions.includes(ACT_PERMISSION))
        .map((role) => ({ value: role.code, label: `${roleLabel(role.code)} (${role.code})` })),
    [roles.data],
  );

  const roleInput = (role: string | null, set: (code: string | null) => void) =>
    roles.isError ? (
      <Space orientation="vertical" style={{ width: "100%" }} size={4}>
        <Input
          disabled={disabled}
          status={status}
          placeholder="Mã role, vd LEGAL"
          value={role ?? ""}
          onChange={(event) => set(event.target.value.trim().toUpperCase() || null)}
        />
        <Typography.Text type="warning" style={{ fontSize: 12 }}>
          Không tải được danh sách role (cần quyền Role.Admin) – nhập mã thủ công.
        </Typography.Text>
      </Space>
    ) : (
      <Select
        showSearch
        optionFilterProp="label"
        disabled={disabled}
        status={status}
        loading={roles.isLoading}
        placeholder="Chọn role có quyền duyệt"
        style={{ width: "100%" }}
        value={role ?? undefined}
        onChange={(code: string) => set(code)}
        options={roleOptions}
      />
    );

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size={6}>
      <Flex gap={8} wrap>
        <Select
          aria-label="Kiểu người duyệt"
          style={{ width: 170 }}
          disabled={disabled}
          value={value.type}
          onChange={(type: AssigneeType) => onChange(emptyRule(type))}
          options={(Object.keys(ASSIGNEE_TYPE_LABELS) as AssigneeType[]).map((type) => ({
            value: type,
            label: ASSIGNEE_TYPE_LABELS[type],
          }))}
        />
        <div style={{ flex: 1, minWidth: 220 }}>
          {value.type === "ROLE" &&
            roleInput(value.value, (code) => onChange({ ...value, value: code }))}
          {value.type === "USER" && (
            <UserSelect
              disabled={disabled}
              status={status}
              value={value.value}
              onChange={(next) => onChange({ ...value, value: (next as string | null) ?? null })}
            />
          )}
          {value.type === "DYNAMIC" && (
            <Radio.Group
              disabled={disabled}
              value={value.value}
              onChange={(event) => onChange({ ...value, value: event.target.value as string })}
              options={DYNAMIC_EXPRESSIONS}
            />
          )}
          {value.type === "GROUP" && (
            <Space orientation="vertical" style={{ width: "100%" }} size={6}>
              <Radio.Group
                disabled={disabled}
                value={groupByRole ? "role" : "users"}
                onChange={(event) => {
                  const byRole = event.target.value === "role";
                  setGroupByRole(byRole);
                  onChange({ ...value, value: null, userIds: [] });
                }}
                options={[
                  { value: "users", label: "Danh sách người" },
                  { value: "role", label: "Theo role" },
                ]}
              />
              {groupByRole ? (
                roleInput(value.value, (code) => onChange({ ...value, value: code, userIds: [] }))
              ) : (
                <UserSelect
                  mode="multiple"
                  disabled={disabled}
                  status={status}
                  value={value.userIds}
                  onChange={(next) =>
                    onChange({ ...value, value: null, userIds: (next as string[] | null) ?? [] })
                  }
                />
              )}
            </Space>
          )}
        </div>
      </Flex>
      {(value.type === "ROLE" || (value.type === "GROUP" && groupByRole)) && (
        <RoleHolders
          role={value.value}
          sameDepartment={value.scope === "SAME_DEPARTMENT_AS_SUBMITTER"}
        />
      )}
      {value.type === "DYNAMIC" && (
        <Alert
          type="info"
          showIcon
          title="Người duyệt xác định lúc gửi duyệt theo phòng ban của người gửi."
        />
      )}
    </Space>
  );
}

import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Descriptions,
  Drawer,
  Flex,
  Form,
  Input,
  Radio,
  Skeleton,
  Typography,
} from "antd";

import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { useConflictModal } from "@/shared/components/feedback/useConflictModal";
import { isConflict } from "@/shared/lib/problem";

import type { DataScope, Role } from "../api/identity";
import { usePermissionCatalog, useUpdateRole } from "../hooks/useIdentityAdmin";
import { actionOf, groupPermissionCatalog, resourceLabel } from "../lib/labels";

interface Values {
  name: string;
  dataScope: DataScope;
  permissions: string[];
}

export function RoleDrawer({ role, onClose }: { role: Role; onClose(): void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const catalog = usePermissionCatalog();
  const update = useUpdateRole();
  const showConflict = useConflictModal();
  const [serverError, setServerError] = useState<unknown>();
  const readOnly = role.system;

  const submit = (values: Values) => {
    setServerError(undefined);
    update.mutate(
      { code: role.code, input: { ...values, name: values.name.trim() } },
      {
        onSuccess: (saved) => {
          message.success(`Đã cập nhật vai trò ${saved.name}. Có hiệu lực ngay cho người dùng.`);
          onClose();
        },
        onError: (error) => {
          if (isConflict(error)) {
            onClose();
            showConflict(error, () => undefined);
            return;
          }
          setServerError(error);
        },
      },
    );
  };

  return (
    <Drawer
      open
      width={640}
      title={`${readOnly ? "Vai trò" : "Sửa vai trò"} ${role.code}`}
      onClose={onClose}
      footer={
        readOnly ? undefined : (
          <Flex justify="flex-end" gap={8}>
            <Button onClick={onClose}>Hủy</Button>
            <Button type="primary" loading={update.isPending} onClick={() => form.submit()}>
              Lưu
            </Button>
          </Flex>
        )
      }
    >
      {readOnly && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="Vai trò hệ thống – chỉ xem"
          description="Quyền của vai trò hệ thống được quản lý bằng migration ở backend để luôn đúng ma trận phân quyền đã duyệt."
        />
      )}
      {serverError !== undefined && (
        <ProblemAlert error={serverError} style={{ marginBottom: 16 }} />
      )}
      {catalog.isLoading ? (
        <Skeleton active />
      ) : catalog.isError ? (
        <ProblemAlert error={catalog.error} />
      ) : (
        <Form<Values>
          form={form}
          layout="vertical"
          disabled={readOnly}
          onFinish={submit}
          initialValues={{
            name: role.name,
            dataScope: role.dataScope,
            permissions: role.permissions,
          }}
        >
          <Form.Item
            name="name"
            label="Tên vai trò"
            rules={[{ required: true, whitespace: true, message: "Nhập tên vai trò" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="dataScope"
            label="Phạm vi dữ liệu"
            extra="Phòng ban: chỉ thấy và thao tác hồ sơ của phòng mình. Toàn công ty: mọi phòng."
          >
            <Radio.Group
              options={[
                { value: "DEPARTMENT", label: "Phòng ban" },
                { value: "ALL", label: "Toàn công ty" },
              ]}
            />
          </Form.Item>
          <Form.Item name="permissions" label="Quyền">
            <Checkbox.Group style={{ width: "100%" }}>
              <Descriptions column={1} size="small" bordered style={{ width: "100%" }}>
                {groupPermissionCatalog(catalog.data ?? []).map(({ resource, codes }) => (
                  <Descriptions.Item key={resource} label={resourceLabel(resource)}>
                    <Flex wrap gap={8}>
                      {codes.map((code) => (
                        <Checkbox key={code} value={code}>
                          <Typography.Text title={code}>{actionOf(code)}</Typography.Text>
                        </Checkbox>
                      ))}
                    </Flex>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
}

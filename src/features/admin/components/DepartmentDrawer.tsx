import { useState } from "react";
import { App, Button, Drawer, Flex, Form, Input, Select } from "antd";

import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { errorCodeOf, errorMessage, fieldErrorsOf } from "@/shared/lib/problem";

import type { Department, DepartmentInput, UserRow } from "../api/identity";
import { useCreateDepartment, useUpdateDepartment } from "../hooks/useIdentityAdmin";

interface Props {
  department?: Department;
  departments: Department[];
  users: UserRow[];
  onClose(): void;
}

interface Values {
  code: string;
  name: string;
  headUserId?: string;
  parentId?: string;
}

export function DepartmentDrawer({ department, departments, users, onClose }: Props) {
  const editing = !!department;
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<Values>();
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const [serverError, setServerError] = useState<unknown>();
  const saving = create.isPending || update.isPending;

  const close = () => {
    if (form.isFieldsTouched()) {
      modal.confirm({
        title: "Bỏ thay đổi chưa lưu?",
        content: "Những gì bạn vừa nhập sẽ mất.",
        okText: "Bỏ thay đổi",
        okButtonProps: { danger: true },
        cancelText: "Ở lại",
        onOk: onClose,
      });
    } else {
      onClose();
    }
  };

  const handleError = (error: unknown) => {
    if (errorCodeOf(error) === "AUTH_DEPARTMENT_CODE_EXISTS") {
      form.setFields([{ name: "code", errors: [errorMessage(error)] }]);
      return;
    }
    const fieldErrors = fieldErrorsOf(error).filter((item) => item.field);
    if (fieldErrors.length > 0) {
      form.setFields(
        fieldErrors.map((item) => ({
          name: item.field as keyof Values,
          errors: [item.message ?? "Không hợp lệ"],
        })),
      );
      return;
    }
    setServerError(error);
  };

  const submit = (values: Values) => {
    setServerError(undefined);
    const input: DepartmentInput = {
      code: values.code.trim(),
      name: values.name.trim(),
      headUserId: values.headUserId ?? null,
      parentId: values.parentId ?? null,
    };
    if (department) {
      update.mutate(
        { id: department.id, input },
        {
          onSuccess: (saved) => {
            message.success(`Đã cập nhật phòng ban ${saved.name}`);
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: (saved) => {
          message.success(`Đã thêm phòng ban ${saved.name}`);
          onClose();
        },
        onError: handleError,
      });
    }
  };

  return (
    <Drawer
      open
      width={560}
      title={editing ? `Sửa phòng ban ${department.code}` : "Thêm phòng ban"}
      onClose={close}
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={close}>Hủy</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {editing ? "Lưu" : "Thêm"}
          </Button>
        </Flex>
      }
    >
      {serverError !== undefined && (
        <ProblemAlert error={serverError} style={{ marginBottom: 16 }} />
      )}
      <Form<Values>
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={
          department
            ? {
                code: department.code,
                name: department.name,
                headUserId: department.headUserId ?? undefined,
                parentId: department.parentId ?? undefined,
              }
            : {}
        }
      >
        <Form.Item
          name="code"
          label="Mã phòng ban"
          extra="Trùng với thuộc tính department của người dùng trong Keycloak, vd KD, KTOAN."
          rules={[
            { required: true, whitespace: true, message: "Nhập mã phòng ban" },
            { max: 32, message: "Tối đa 32 ký tự" },
          ]}
          normalize={(value: string) => value?.toUpperCase().replace(/\s+/g, "")}
        >
          <Input autoFocus={!editing} />
        </Form.Item>
        <Form.Item
          name="name"
          label="Tên phòng ban"
          rules={[
            { required: true, whitespace: true, message: "Nhập tên phòng ban" },
            { max: 200, message: "Tối đa 200 ký tự" },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="headUserId" label="Trưởng phòng">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Chọn người dùng"
            options={users.map((user) => ({
              value: user.id,
              label: `${user.fullName} (${user.username})`,
            }))}
          />
        </Form.Item>
        <Form.Item name="parentId" label="Trực thuộc">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Không trực thuộc phòng nào"
            options={departments
              .filter((item) => item.id !== department?.id)
              .map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }))}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

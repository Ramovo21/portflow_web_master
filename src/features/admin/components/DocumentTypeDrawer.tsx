import { useState } from "react";
import { App, Button, Drawer, Flex, Form, Input, Switch } from "antd";

import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";

import type { DocumentType } from "../api/identity";
import { useUpdateDocumentType } from "../hooks/useIdentityAdmin";
import { parseRequirements } from "../lib/requirements";

interface Values {
  name: string;
  workflowKey: string;
  requiresESign: boolean;
  active: boolean;
  submitRequirements: string;
}

export function DocumentTypeDrawer({ type, onClose }: { type: DocumentType; onClose(): void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const update = useUpdateDocumentType();
  const [serverError, setServerError] = useState<unknown>();

  const submit = (values: Values) => {
    setServerError(undefined);
    update.mutate(
      {
        code: type.code,
        input: {
          name: values.name.trim(),
          workflowKey: values.workflowKey.trim(),
          requiresESign: values.requiresESign,
          active: values.active,
          submitRequirements: parseRequirements(values.submitRequirements) ?? {},
        },
      },
      {
        onSuccess: (saved) => {
          message.success(`Đã cập nhật loại hồ sơ ${saved.name}`);
          onClose();
        },
        onError: setServerError,
      },
    );
  };

  return (
    <Drawer
      open
      width={560}
      title={`Sửa loại hồ sơ ${type.code}`}
      onClose={onClose}
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={update.isPending} onClick={() => form.submit()}>
            Lưu
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
        initialValues={{
          name: type.name,
          workflowKey: type.workflowKey,
          requiresESign: type.requiresESign,
          active: type.active,
          submitRequirements: JSON.stringify(type.submitRequirements ?? {}, null, 2),
        }}
      >
        <Form.Item
          name="name"
          label="Tên loại hồ sơ"
          rules={[{ required: true, whitespace: true, message: "Nhập tên loại hồ sơ" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="workflowKey"
          label="Mã quy trình duyệt"
          extra="Quy trình đang hoạt động có mã này được dùng khi hồ sơ gửi duyệt."
          rules={[{ required: true, whitespace: true, message: "Nhập mã quy trình" }]}
        >
          <Input />
        </Form.Item>
        <Flex gap={32}>
          <Form.Item name="requiresESign" label="Cần ký số sau khi duyệt" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="active" label="Đang dùng" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Flex>
        <Form.Item
          name="submitRequirements"
          label="Điều kiện khi gửi duyệt (JSON)"
          extra='Ví dụ: {"attachments": ["SIGNED_SCAN"]}'
          rules={[
            {
              validator: (_, value: string) =>
                parseRequirements(value ?? "") === undefined
                  ? Promise.reject(new Error("JSON không hợp lệ – cần một object { … }"))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input.TextArea rows={6} style={{ fontFamily: "monospace" }} spellCheck={false} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

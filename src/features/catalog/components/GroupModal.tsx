import { App, Form, Input, Modal } from "antd";

import { errorCodeOf, errorMessage } from "@/shared/lib/problem";

import { useCreateServiceGroup } from "../hooks/useCatalog";

export function GroupModal({ onClose }: { onClose(): void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ code: string; name: string }>();
  const create = useCreateServiceGroup();

  return (
    <Modal
      open
      title="Thêm nhóm dịch vụ"
      okText="Lưu"
      cancelText="Hủy"
      okButtonProps={{ loading: create.isPending }}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) =>
          create.mutate(
            { code: values.code.trim().toUpperCase(), name: values.name.trim() },
            {
              onSuccess: (group) => {
                message.success(`Added group ${group.name}`);
                onClose();
              },
              onError: (error) => {
                if (errorCodeOf(error) === "PRC_SERVICE_CODE_DUPLICATE") {
                  form.setFields([{ name: "code", errors: ["Mã nhóm đã tồn tại"] }]);
                } else {
                  message.error(errorMessage(error));
                }
              },
            },
          )
        }
      >
        <Form.Item
          name="code"
          label="Mã nhóm"
          normalize={(value: string) => value?.toUpperCase().replace(/\s/g, "")}
          rules={[
            { required: true, message: "Enter a group code" },
            {
              pattern: /^[A-Z0-9_]{2,40}$/,
              message: "Use uppercase letters, digits or '_' (2–40 characters)",
            },
          ]}
        >
          <Input placeholder="VD: CONT_HANDLING" maxLength={40} />
        </Form.Item>
        <Form.Item
          name="name"
          label="Tên nhóm"
          rules={[{ required: true, whitespace: true, message: "Enter a group name" }]}
        >
          <Input maxLength={255} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

import { useEffect } from "react";
import { Alert, Form, Input, Modal } from "antd";

interface Props {
  open: boolean;
  title: string;

  description?: React.ReactNode;
  okText?: string;
  danger?: boolean;
  minLength?: number;
  required?: boolean;
  placeholder?: string;
  loading?: boolean;
  onSubmit(reason: string): void;
  onCancel(): void;
}

export function ReasonModal({
  open,
  title,
  description,
  okText = "Xác nhận",
  danger,
  minLength = 1,
  required = true,
  placeholder = "Nhập lý do",
  loading,
  onSubmit,
  onCancel,
}: Props) {
  const [form] = Form.useForm<{ reason: string }>();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      okButtonProps={{ danger, loading }}
      cancelText="Đóng"
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      {description && (
        <Alert
          type={danger ? "warning" : "info"}
          showIcon
          title={description}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => onSubmit(values.reason?.trim() ?? "")}
      >
        <Form.Item
          name="reason"
          label="Lý do"
          rules={[
            ...(required
              ? [{ required: true, whitespace: true, message: "Please enter a reason" }]
              : []),
            ...(minLength > 1
              ? [{ min: minLength, message: `At least ${minLength} characters` }]
              : []),
          ]}
        >
          <Input.TextArea rows={4} placeholder={placeholder} showCount maxLength={1000} autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
}

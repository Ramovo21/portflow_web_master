import { useState } from "react";
import { App, Button, Form, Input, InputNumber, Modal, Typography } from "antd";
import { ExperimentOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { workflowKeys } from "@/features/workflow";
import { fetchDemoStatus, submitDemo, type DemoSubmission } from "@/features/workflow/api/demo";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { useIdempotentMutation } from "@/shared/hooks/useIdempotentMutation";

interface Props {
  onSubmitted(): void;
}

/** Nút "Tạo hồ sơ demo" – chỉ hiện khi backend bật chế độ demo workflow (dev). */
export function DemoSubmitButton({ onSubmitted }: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<DemoSubmission>();
  const status = useQuery({
    queryKey: ["workflow-demo"],
    queryFn: fetchDemoStatus,
    staleTime: Infinity,
    retry: false,
  });
  const submit = useIdempotentMutation((input: DemoSubmission, key) => submitDemo(input, key), {
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.inbox });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.counters });
      message.success(
        result.workflow.currentStepName
          ? `Đã trình duyệt – đang chờ bước “${result.workflow.currentStepName}”.`
          : "Đã trình duyệt.",
      );
      setOpen(false);
      onSubmitted();
    },
  });

  if (!status.data?.enabled) return null;

  const openModal = () => {
    submit.resetKey();
    form.setFieldsValue({
      title: "Hợp đồng dịch vụ xếp dỡ (demo)",
      customerName: "Cty XYZ",
      amount: 300_000_000,
    });
    setOpen(true);
  };

  return (
    <>
      <Button icon={<ExperimentOutlined />} onClick={openModal}>
        Tạo hồ sơ demo
      </Button>
      <Modal
        open={open}
        title="Trình duyệt hồ sơ demo"
        okText="Trình duyệt"
        cancelText="Hủy"
        confirmLoading={submit.isPending}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          Chỉ dùng khi phát triển: tạo một hồ sơ loại DEMO đứng tên bạn và trình vào quy trình
          duyệt. Trưởng phòng Kinh doanh cùng phòng duyệt bước 1, Pháp chế duyệt khi giá trị trên
          500 triệu, sau đó Ban Giám đốc.
        </Typography.Paragraph>
        {submit.isError && <ProblemAlert error={submit.error} />}
        <Form form={form} layout="vertical" onFinish={(values) => submit.mutate(values)}>
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: "Nhập tiêu đề" }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="customerName" label="Khách hàng">
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Giá trị (VND)"
            rules={[{ required: true, message: "Nhập giá trị" }]}
          >
            <InputNumber<number>
              min={0}
              step={100_000_000}
              style={{ width: "100%" }}
              formatter={(value) => `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              parser={(value) => Number((value ?? "").replace(/\./g, ""))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

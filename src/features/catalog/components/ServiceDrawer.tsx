import { App, Button, Checkbox, Drawer, Flex, Form, Input, InputNumber, Select } from "antd";

import { errorCodeOf, errorMessage } from "@/shared/lib/problem";

import { UOM_OPTIONS, type ServiceItem, type Uom } from "../api/catalog";
import { useCreateService, useServiceGroups, useUpdateService } from "../hooks/useCatalog";

interface Props {
  service: ServiceItem | null;
  defaultGroupCode?: string;
  onClose(): void;
}

interface Values {
  code: string;
  name: string;
  groupCode: string;
  uom: Uom;
  taxPercent: number;
  mandatoryDefault: boolean;
}

const CODE_PATTERN = /^[A-Z0-9_-]{2,40}$/;

export function ServiceDrawer({ service, defaultGroupCode, onClose }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const groups = useServiceGroups();
  const create = useCreateService();
  const update = useUpdateService();
  const editing = service !== null;
  const saving = create.isPending || update.isPending;

  const onError = (error: unknown) => {
    const code = errorCodeOf(error);
    if (code === "PRC_SERVICE_IN_USE") {
      form.setFields([
        {
          name: "uom",
          errors: ["Used in a price list – to change the unit of measure, create a new service"],
        },
      ]);
    } else if (code === "PRC_SERVICE_CODE_DUPLICATE") {
      form.setFields([{ name: "code", errors: ["Mã dịch vụ đã tồn tại"] }]);
    } else {
      message.error(errorMessage(error));
    }
  };

  const submit = (values: Values) => {
    const input = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      groupCode: values.groupCode,
      uom: values.uom,
      defaultTaxRate: Math.round(values.taxPercent * 100) / 10_000,
      mandatoryDefault: values.mandatoryDefault,
    };
    const onSuccess = () => {
      message.success(editing ? `Updated ${input.code}` : `Added service ${input.code}`);
      onClose();
    };
    if (service) update.mutate({ id: service.id, input }, { onSuccess, onError });
    else create.mutate(input, { onSuccess, onError });
  };

  return (
    <Drawer
      open
      size={560}
      title={editing ? `Sửa dịch vụ ${service.code}` : "Thêm dịch vụ"}
      onClose={onClose}
      destroyOnHidden
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            Lưu
          </Button>
        </Flex>
      }
    >
      <Form<Values>
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{
          code: service?.code ?? "",
          name: service?.name ?? "",
          groupCode: service?.groupCode ?? defaultGroupCode,
          uom: service?.uom,
          taxPercent: service ? Math.round(service.defaultTaxRate * 10_000) / 100 : 8,
          mandatoryDefault: service?.mandatoryDefault ?? false,
        }}
      >
        <Form.Item
          name="code"
          label="Mã dịch vụ"
          normalize={(value: string) => value?.toUpperCase().replace(/\s/g, "")}
          rules={[
            { required: true, message: "Enter a service code" },
            {
              pattern: CODE_PATTERN,
              message: "Use uppercase letters, digits, '_' or '-' (2–40 characters)",
            },
          ]}
        >
          <Input disabled={editing} placeholder="VD: STO-OOG-DAY" maxLength={40} />
        </Form.Item>
        <Form.Item
          name="name"
          label="Tên"
          rules={[{ required: true, whitespace: true, message: "Enter a service name" }]}
        >
          <Input maxLength={255} placeholder="VD: Lưu bãi hàng quá khổ/ngày" />
        </Form.Item>
        <Form.Item
          name="groupCode"
          label="Nhóm"
          rules={[{ required: true, message: "Select a group" }]}
        >
          <Select
            disabled={editing}
            loading={groups.isLoading}
            options={(groups.data ?? []).map((group) => ({ value: group.code, label: group.name }))}
            placeholder="Chọn nhóm dịch vụ"
          />
        </Form.Item>
        <Form.Item
          name="uom"
          label="Đơn vị tính"
          rules={[{ required: true, message: "Select a unit of measure" }]}
        >
          <Select options={UOM_OPTIONS} placeholder="Select a unit of measure" />
        </Form.Item>
        <Form.Item
          name="taxPercent"
          label="Thuế suất"
          rules={[{ required: true, message: "Enter a tax rate" }]}
        >
          <InputNumber min={0} max={99.99} precision={2} suffix="%" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="mandatoryDefault" valuePropName="checked">
          <Checkbox>Bắt buộc mặc định (bảng thanh toán phải có dòng này – PAY-04)</Checkbox>
        </Form.Item>
      </Form>
    </Drawer>
  );
}

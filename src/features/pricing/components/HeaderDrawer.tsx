import { App, Button, DatePicker, Drawer, Flex, Form, Input, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import { useConflictModal } from "@/shared/components/feedback/useConflictModal";
import { errorCodeOf, errorMessage, isConflict } from "@/shared/lib/problem";

import type { PriceListDetail } from "../api/priceLists";
import { useUpdateHeader } from "../hooks/usePricing";

interface Values {
  name: string;
  currency: string;
  validFrom: Dayjs;
  validTo: Dayjs | null;
  note: string;
}

export function HeaderDrawer({
  priceList,
  onClose,
}: {
  priceList: PriceListDetail;
  onClose(): void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const update = useUpdateHeader(priceList.id);
  const showConflict = useConflictModal();

  const submit = (values: Values) =>
    update.mutate(
      {
        version: priceList.version,
        header: {
          scope: priceList.scope,
          scopeId: priceList.scopeId,
          serviceType: priceList.serviceType,
          name: values.name.trim(),
          currency: values.currency,
          validFrom: values.validFrom.format("YYYY-MM-DD"),
          validTo: values.validTo ? values.validTo.format("YYYY-MM-DD") : null,
          note: values.note?.trim() || null,
        },
      },
      {
        onSuccess: () => {
          message.success("Price list details saved");
          onClose();
        },
        onError: (error) => {
          const code = errorCodeOf(error);
          if (isConflict(error)) {
            onClose();
            showConflict(error, () => undefined);
          } else if (code === "PRC_INVALID_RANGE") {
            form.setFields([{ name: "validTo", errors: [errorMessage(error)] }]);
          } else if (code === "PRC_SCOPE_TARGET_INVALID") {
            form.setFields([{ name: "validFrom", errors: [errorMessage(error)] }]);
          } else {
            message.error(errorMessage(error));
          }
        },
      },
    );

  return (
    <Drawer
      open
      size={560}
      title={`Sửa thông tin ${priceList.code}`}
      onClose={onClose}
      destroyOnHidden
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={update.isPending} onClick={() => form.submit()}>
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
          name: priceList.name,
          currency: priceList.currency,
          validFrom: dayjs(priceList.validFrom),
          validTo: priceList.validTo ? dayjs(priceList.validTo) : null,
          note: priceList.note ?? "",
        }}
      >
        <Form.Item
          name="name"
          label="Tên"
          rules={[{ required: true, whitespace: true, message: "Enter a price list name" }]}
        >
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name="currency" label="Tiền tệ">
          <Select
            options={[
              { value: "VND", label: "VND" },
              { value: "USD", label: "USD" },
            ]}
            style={{ width: 160 }}
          />
        </Form.Item>
        <Flex gap={16} wrap>
          <Form.Item
            name="validFrom"
            label="Hiệu lực từ"
            rules={[{ required: true, message: "Select a date" }]}
          >
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            name="validTo"
            label="Đến (trống = không thời hạn)"
            dependencies={["validFrom"]}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value: Dayjs | null) =>
                  !value ||
                  !getFieldValue("validFrom") ||
                  !value.isBefore(getFieldValue("validFrom"), "day")
                    ? Promise.resolve()
                    : Promise.reject(new Error("End date must be after start date")),
              }),
            ]}
          >
            <DatePicker format="DD/MM/YYYY" allowClear />
          </Form.Item>
        </Flex>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={3} maxLength={1000} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

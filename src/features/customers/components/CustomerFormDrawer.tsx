import { useState } from "react";
import {
  App,
  Button,
  Col,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  Radio,
  Row,
  Space,
  Typography,
} from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  DeleteOutlined,
  LoadingOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { useConflictModal } from "@/shared/components/feedback/useConflictModal";
import { errorCodeOf, errorMessage, fieldErrorsOf, isConflict } from "@/shared/lib/problem";

import { fetchCustomers, type Contact, type Customer } from "../api/customers";
import { useCreateCustomer, useTaxCodeCheck, useUpdateCustomer } from "../hooks/useCustomers";
import { customerSchema, isValidTaxCode, normalizeTaxCode, PHONE_PATTERN } from "../schema";

interface FormValues {
  name: string;
  taxCode?: string;
  address?: string;
  representative?: { fullName?: string; position?: string };
  contacts: Omit<Contact, "primary">[];

  primaryIndex?: number;
}

interface Props {
  open: boolean;

  customer?: Customer;
  onClose(): void;
}

type FieldUpdates = Parameters<ReturnType<typeof Form.useForm<FormValues>>[0]["setFields"]>[0];

function toNamePath(field: string): (string | number)[] {
  return field
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

function DuplicateHint({ taxCode }: { taxCode: string }) {
  const lookup = useQuery({
    queryKey: ["customers", { q: taxCode, size: 1, page: 0 }],
    queryFn: () => fetchCustomers({ q: taxCode, page: 0, size: 1 }),
  });
  const match = lookup.data?.items.find((item) => item.taxCode === taxCode);
  if (lookup.isLoading) return null;
  return match ? (
    <Link to={`/customers/${match.id}`} target="_blank">
      Mở {match.code} – {match.name}
    </Link>
  ) : (
    <span>MST đã được phòng khác đăng ký. Liên hệ TP Kinh doanh để chuyển phụ trách.</span>
  );
}

function initialValues(customer: Customer | undefined): Partial<FormValues> {
  if (!customer) return { contacts: [] };
  const primaryIndex = customer.contacts.findIndex((contact) => contact.primary);
  return {
    name: customer.name,
    address: customer.address ?? undefined,
    representative: {
      fullName: customer.representative?.fullName ?? undefined,
      position: customer.representative?.position ?? undefined,
    },
    contacts: customer.contacts.map(({ name, email, phone, role }) => ({
      name,
      email,
      phone,
      role,
    })),
    primaryIndex: primaryIndex >= 0 ? primaryIndex : undefined,
  };
}

export function CustomerFormDrawer(props: Props) {
  return props.open ? <CustomerFormDrawerContent {...props} /> : null;
}

function CustomerFormDrawerContent({ open, customer, onClose }: Props) {
  const editing = !!customer;
  const [form] = Form.useForm<FormValues>();
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const showConflict = useConflictModal();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const [checkedTaxCode, setCheckedTaxCode] = useState<string>();
  const [serverError, setServerError] = useState<unknown>();
  const taxCodeCheck = useTaxCodeCheck(editing ? undefined : checkedTaxCode);
  const rawTaxCode = Form.useWatch("taxCode", form);
  const contacts = Form.useWatch("contacts", form) ?? [];
  const primaryIndex = Form.useWatch("primaryIndex", form) as number | undefined;

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

  const onTaxCodeBlur = () => {
    const normalized = normalizeTaxCode(form.getFieldValue("taxCode"));
    setCheckedTaxCode(isValidTaxCode(normalized) ? normalized : undefined);
  };

  const handleError = (error: unknown) => {
    if (isConflict(error)) {
      onClose();
      showConflict(error, () => undefined);
      return;
    }
    const code = errorCodeOf(error);
    if (code === "CUS_TAX_CODE_DUPLICATE" || code === "CUS_TAX_CODE_INVALID") {
      form.setFields([{ name: "taxCode", errors: [errorMessage(error)] }]);
      if (code === "CUS_TAX_CODE_DUPLICATE")
        setCheckedTaxCode(normalizeTaxCode(form.getFieldValue("taxCode")));
      return;
    }
    const fieldErrors = fieldErrorsOf(error).filter((item) => item.field);
    if (fieldErrors.length > 0) {
      form.setFields(
        fieldErrors.map((item) => ({
          name: toNamePath(item.field!),
          errors: [item.message ?? ""],
        })) as FieldUpdates,
      );
      return;
    }
    setServerError(error);
  };

  const submit = (values: FormValues) => {
    setServerError(undefined);
    const parsed = customerSchema.safeParse({
      ...values,
      contacts: (values.contacts ?? []).map((contact, index) => ({
        ...contact,
        primary: index === values.primaryIndex,
      })),
    });
    if (!parsed.success) {
      form.setFields(
        parsed.error.issues.map((issue) => ({
          name:
            issue.path.length === 1 && issue.path[0] === "contacts"
              ? "primaryIndex"
              : (issue.path as (string | number)[]),
          errors: [issue.message],
        })) as FieldUpdates,
      );
      return;
    }
    const payload = {
      name: parsed.data.name,
      address: parsed.data.address,
      representative:
        parsed.data.representative?.fullName || parsed.data.representative?.position
          ? {
              fullName: parsed.data.representative.fullName ?? null,
              position: parsed.data.representative.position ?? null,
            }
          : null,
      contacts: parsed.data.contacts.map((contact) => ({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        primary: contact.primary,
      })),
    };
    if (customer) {
      updateMutation.mutate(
        { id: customer.id, version: customer.version, payload },
        {
          onSuccess: () => {
            message.success("Customer updated.");
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createMutation.mutate(
        { ...payload, taxCode: normalizeTaxCode(values.taxCode) },
        {
          onSuccess: (created) => {
            message.success(`Added ${created.code}`);
            onClose();
            navigate(`/customers/${created.id}`);
          },
          onError: handleError,
        },
      );
    }
  };

  const normalizedPreview = normalizeTaxCode(rawTaxCode);
  const taxCodeExtra = (() => {
    if (editing || !rawTaxCode) return undefined;
    const parts: React.ReactNode[] = [];
    if (normalizedPreview !== rawTaxCode && isValidTaxCode(normalizedPreview)) {
      parts.push(<span key="norm">→ lưu thành {normalizedPreview}</span>);
    }
    if (checkedTaxCode && checkedTaxCode === normalizedPreview) {
      if (taxCodeCheck.isFetching) {
        parts.push(
          <span key="check">
            <LoadingOutlined /> Đang kiểm tra…
          </span>,
        );
      } else if (taxCodeCheck.data?.exists) {
        parts.push(
          <Typography.Text key="check" type="danger">
            <CloseCircleFilled /> Đã tồn tại. <DuplicateHint taxCode={checkedTaxCode} />
          </Typography.Text>,
        );
      } else if (taxCodeCheck.data) {
        parts.push(
          <Typography.Text key="check" type="success">
            <CheckCircleFilled /> Chưa có trong hệ thống
          </Typography.Text>,
        );
      }
    }
    return parts.length ? (
      <Space size={8} wrap>
        {parts}
      </Space>
    ) : undefined;
  })();

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Drawer
      open={open}
      title={editing ? `Sửa khách hàng ${customer.code}` : "Thêm khách hàng"}
      size={560}
      onClose={close}
      destroyOnHidden
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={close}>Hủy</Button>
          <Button type="primary" loading={pending} onClick={() => form.submit()}>
            Lưu khách hàng
          </Button>
        </Flex>
      }
    >
      {serverError !== undefined && (
        <ProblemAlert error={serverError} style={{ marginBottom: 16 }} />
      )}
      {editing && (
        <Typography.Paragraph type="secondary">
          Mã KH <b>{customer.code}</b> · MST <b>{customer.taxCode}</b> (không sửa được)
        </Typography.Paragraph>
      )}
      <Form<FormValues>
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={initialValues(customer)}
      >
        <Form.Item
          name="name"
          label="Tên khách hàng"
          rules={[
            { required: true, whitespace: true, message: "Enter a customer name" },
            { max: 255, message: "Maximum 255 characters" },
          ]}
        >
          <Input autoFocus placeholder="Công ty TNHH Vận tải Biển Xanh" />
        </Form.Item>
        {!editing && (
          <Form.Item
            name="taxCode"
            label="Mã số thuế"
            extra={taxCodeExtra}
            validateTrigger="onBlur"
            rules={[
              { required: true, message: "Enter a tax code" },
              {
                validator: (_rule, value: string | undefined) =>
                  !value || isValidTaxCode(value)
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          "The tax code must be 10 digits, or 13 digits in the format 0101234567-001",
                        ),
                      ),
              },
            ]}
          >
            <Input placeholder="0101 234 567" onBlur={onTaxCodeBlur} />
          </Form.Item>
        )}
        <Form.Item
          name="address"
          label="Địa chỉ"
          rules={[{ max: 500, message: "Maximum 500 characters" }]}
        >
          <Input />
        </Form.Item>

        <Divider titlePlacement="start" plain>
          Người đại diện
        </Divider>
        <Row gutter={12}>
          <Col span={14}>
            <Form.Item name={["representative", "fullName"]} label="Họ tên">
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name={["representative", "position"]} label="Chức vụ">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="primaryIndex" hidden>
          <Input />
        </Form.Item>
        <Form.List name="contacts">
          {(fields, { add, remove }) => (
            <>
              <Divider titlePlacement="start" plain>
                <Space>
                  Liên hệ
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      add({ name: "", email: null, phone: null, role: null });
                      if (fields.length === 0) form.setFieldValue("primaryIndex", 0);
                    }}
                  >
                    Thêm
                  </Button>
                </Space>
              </Divider>
              {fields.map((field, index) => (
                <div key={field.key} className="pf-contact-row" data-testid={`contact-${index}`}>
                  <Flex gap={8} align="flex-start" wrap={false}>
                    <Radio
                      checked={primaryIndex === index}
                      onChange={() => form.setFieldValue("primaryIndex", index)}
                      aria-label={`Liên hệ chính ${index + 1}`}
                      style={{ marginTop: 6 }}
                    >
                      Chính
                    </Radio>
                    <Row gutter={8} style={{ flex: 1 }}>
                      <Col span={12}>
                        <Form.Item
                          name={[field.name, "name"]}
                          rules={[
                            { required: true, whitespace: true, message: "Enter a contact name" },
                          ]}
                        >
                          <Input placeholder="Họ tên" aria-label={`Tên liên hệ ${index + 1}`} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name={[field.name, "role"]}>
                          <Input placeholder="Vai trò (Kế toán…)" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name={[field.name, "email"]}
                          rules={[{ type: "email", message: "Invalid email" }]}
                        >
                          <Input placeholder="Email" aria-label={`Email liên hệ ${index + 1}`} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name={[field.name, "phone"]}
                          rules={[
                            { pattern: PHONE_PATTERN, message: "Phone number must be 8–20 digits" },
                          ]}
                        >
                          <Input placeholder="Số điện thoại" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Button
                      type="text"
                      danger
                      aria-label={`Xóa liên hệ ${index + 1}`}
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        remove(field.name);
                        const remaining = fields.length - 1;
                        if (remaining === 0) form.setFieldValue("primaryIndex", undefined);
                        else if (primaryIndex === index) form.setFieldValue("primaryIndex", 0);
                        else if (primaryIndex !== undefined && primaryIndex > index)
                          form.setFieldValue("primaryIndex", primaryIndex - 1);
                      }}
                    />
                  </Flex>
                </div>
              ))}
              <Form.Item shouldUpdate noStyle>
                {() => {
                  const errors = form.getFieldError("primaryIndex");
                  return errors.length > 0 ? (
                    <Typography.Text type="danger">{errors[0]}</Typography.Text>
                  ) : null;
                }}
              </Form.Item>
              {fields.length === 0 && (
                <Typography.Text type="secondary">Chưa có liên hệ.</Typography.Text>
              )}
              {contacts.length > 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Chọn đúng một liên hệ chính.
                </Typography.Text>
              )}
            </>
          )}
        </Form.List>
      </Form>
    </Drawer>
  );
}

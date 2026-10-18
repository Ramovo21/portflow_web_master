import { useEffect, useState } from "react";
import { Alert, App, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import { useSession } from "@/features/auth";
import { errorCodeOf, errorMessage, problemOf } from "@/shared/lib/problem";
import { DOCUMENT_TYPE_LABELS } from "@/shared/lib/statusLabels";

import type { ApproverOption } from "../api/delegations";
import { useApprovers, useCreateDelegation } from "../hooks/useDelegations";

interface Values {
  fromUserId?: string;
  toUserId: string;
  documentTypes?: string[];
  period: [Dayjs, Dayjs];
  reason: string;
}

const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function DelegationModal({ onClose }: { onClose(): void }) {
  const { message } = App.useApp();
  const { me, hasPermission } = useSession();
  const isAdmin = hasPermission("User.Admin");
  const [form] = Form.useForm<Values>();
  const create = useCreateDelegation();
  const fromUserId = Form.useWatch("fromUserId", form) ?? me.id;

  return (
    <Modal
      open
      title="Tạo ủy quyền duyệt"
      okText="Ủy quyền"
      cancelText="Hủy"
      okButtonProps={{ loading: create.isPending }}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="Người nhận sẽ thấy hồ sơ cần bạn duyệt trong Inbox và duyệt thay trong thời gian ủy quyền. Lịch sử ghi rõ “duyệt thay”."
      />
      <Form<Values>
        form={form}
        layout="vertical"
        initialValues={{ fromUserId: isAdmin ? undefined : me.id }}
        onFinish={(values) => {
          create.resetKey();
          create.mutate(
            {
              fromUserId: isAdmin ? values.fromUserId : undefined,
              toUserId: values.toUserId,
              documentTypes: values.documentTypes ?? [],
              validFrom: values.period[0].format("YYYY-MM-DD"),
              validTo: values.period[1].format("YYYY-MM-DD"),
              reason: values.reason.trim(),
            },
            {
              onSuccess: (created) => {
                message.success(`Đã ủy quyền cho ${created.toUserName ?? "người nhận"}`);
                onClose();
              },
              onError: (error) => {
                const code = errorCodeOf(error);
                if (code === "AUTH_DELEGATION_OVERLAP") {
                  form.setFields([{ name: "period", errors: [errorMessage(error)] }]);
                } else if (code === "SYS_VALIDATION") {
                  message.error(problemOf(error)?.detail ?? errorMessage(error));
                } else {
                  message.error(errorMessage(error));
                }
              },
            },
          );
        }}
      >
        {isAdmin && (
          <Form.Item
            name="fromUserId"
            label="Người ủy quyền"
            rules={[{ required: true, message: "Chọn người ủy quyền" }]}
          >
            <ApproverSelect placeholder="Tìm người vắng mặt…" />
          </Form.Item>
        )}
        <Form.Item
          name="toUserId"
          label="Người nhận ủy quyền"
          dependencies={["fromUserId"]}
          rules={[
            { required: true, message: "Chọn người nhận ủy quyền" },
            {
              validator: (_, value) =>
                value && value === fromUserId
                  ? Promise.reject(new Error("Không thể ủy quyền cho chính mình"))
                  : Promise.resolve(),
            },
          ]}
        >
          <ApproverSelect placeholder="Tìm theo tên hoặc tài khoản…" exclude={fromUserId} />
        </Form.Item>
        <Form.Item name="documentTypes" label="Loại hồ sơ" extra="Để trống = mọi loại hồ sơ.">
          <Select
            mode="multiple"
            allowClear
            placeholder="Mọi loại hồ sơ"
            options={DOCUMENT_TYPE_OPTIONS}
          />
        </Form.Item>
        <Form.Item
          name="period"
          label="Thời gian ủy quyền"
          rules={[{ required: true, message: "Chọn khoảng thời gian" }]}
        >
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            style={{ width: "100%" }}
            aria-label="Thời gian ủy quyền"
            disabledDate={(date) => date.isBefore(dayjs(), "day")}
          />
        </Form.Item>
        <Form.Item
          name="reason"
          label="Lý do"
          rules={[{ required: true, whitespace: true, message: "Nhập lý do ủy quyền" }]}
        >
          <Input.TextArea rows={2} maxLength={500} placeholder="VD: Nghỉ phép, đi công tác…" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ApproverSelect({
  value,
  onChange,
  placeholder,
  exclude,
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder: string;
  exclude?: string;
}) {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);
  const approvers = useApprovers(query);

  return (
    <Select<string>
      showSearch
      filterOption={false}
      onSearch={setKeyword}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      loading={approvers.isFetching}
      notFoundContent={approvers.isFetching ? "Đang tìm…" : "Không tìm thấy"}
      options={(approvers.data ?? [])
        .filter((user) => user.id !== exclude)
        .map((user: ApproverOption) => ({
          value: user.id,
          label: user.departmentName ? `${user.fullName} – ${user.departmentName}` : user.fullName,
        }))}
    />
  );
}

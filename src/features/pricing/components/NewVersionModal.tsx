import { useState } from "react";
import { Alert, App, Checkbox, DatePicker, Form, Modal, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { Link, useNavigate } from "react-router-dom";

import { formatDate } from "@/shared/lib/format";
import { errorCodeOf, errorMessage } from "@/shared/lib/problem";

import type { PriceListDetail } from "../api/priceLists";
import { minNewVersionDate } from "../domain";
import { useNewVersion, usePriceListVersions } from "../hooks/usePricing";

interface Props {
  base: PriceListDetail;
  onClose(): void;
}

export function NewVersionModal({ base, onClose }: Props) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<{ validFrom: Dayjs; copyLines: boolean }>();
  const mutation = useNewVersion(base.id);
  const versions = usePriceListVersions(base.id);
  const [pendingConflict, setPendingConflict] = useState(false);
  const min = minNewVersionDate(base);
  const validFrom = Form.useWatch("validFrom", form);
  const pending = (versions.data ?? []).find(
    (version) =>
      version.previousVersionId && (version.status === "DRAFT" || version.status === "SUBMITTED"),
  );
  const nextVersion =
    Math.max(base.listVersion, ...(versions.data ?? []).map((v) => v.listVersion)) + 1;

  return (
    <Modal
      open
      title={`Tạo version mới từ ${base.code} (v${base.listVersion})`}
      okText={`Tạo bản nháp v${nextVersion}`}
      cancelText="Hủy"
      okButtonProps={{ loading: mutation.isPending, disabled: !!pending }}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
    >
      {(pending || pendingConflict) && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title="Đã có version mới đang soạn hoặc chờ duyệt."
          description={
            pending ? (
              <Link to={`/pricing/${pending.id}`} onClick={onClose}>
                Mở {pending.code} (v{pending.listVersion})
              </Link>
            ) : undefined
          }
        />
      )}
      <Form
        form={form}
        layout="vertical"
        initialValues={{ copyLines: true, validFrom: min }}
        onFinish={(values) =>
          mutation.mutate(
            { validFrom: values.validFrom.format("YYYY-MM-DD"), copyLines: values.copyLines },
            {
              onSuccess: (created) => {
                message.success(`Draft created: ${created.code} (v${created.listVersion})`);
                onClose();
                navigate(`/pricing/${created.id}?editLines=1`);
              },
              onError: (error) => {
                const code = errorCodeOf(error);
                if (code === "PRC_VERSION_CONFLICT") setPendingConflict(true);
                else if (
                  code === "PRC_NEW_VERSION_DATE_INVALID" ||
                  code === "PRC_RETROACTIVE_BILLED"
                ) {
                  form.setFields([{ name: "validFrom", errors: [errorMessage(error)] }]);
                } else message.error(errorMessage(error));
              },
            },
          )
        }
      >
        <Form.Item
          name="validFrom"
          label="Hiệu lực từ"
          rules={[{ required: true, message: "Select an effective date" }]}
          extra={`Sớm nhất ${formatDate(min.format("YYYY-MM-DD"))}`}
        >
          <DatePicker
            format="DD/MM/YYYY"
            disabledDate={(date) => date.isBefore(min, "day")}
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item name="copyLines" valuePropName="checked">
          <Checkbox>Chép dòng giá từ v{base.listVersion} (sửa giá sau)</Checkbox>
        </Form.Item>
      </Form>
      {validFrom && (
        <Typography.Paragraph type="secondary">
          v{base.listVersion} sẽ kết thúc{" "}
          {formatDate(validFrom.subtract(1, "day").format("YYYY-MM-DD"))} khi v{nextVersion} được
          duyệt, và chuyển "Đã thay thế" từ {formatDate(validFrom.format("YYYY-MM-DD"))}.
        </Typography.Paragraph>
      )}
      {base.billedThrough && (
        <Alert
          type="warning"
          showIcon
          title={`Billed through ${formatDate(base.billedThrough)} – the effective date must be after this date.`}
        />
      )}
    </Modal>
  );
}

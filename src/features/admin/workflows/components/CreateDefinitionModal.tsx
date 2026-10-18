import { useState } from "react";
import { AutoComplete, Modal, Typography } from "antd";

interface Props {
  options: { code: string; name: string }[];
  loading?: boolean;
  onCreate(documentType: string): void;
  onCancel(): void;
}

export function CreateDefinitionModal({ options, loading, onCreate, onCancel }: Props) {
  const [value, setValue] = useState("");
  const code = value.trim().toUpperCase();
  const valid = /^[A-Z][A-Z_]{1,49}$/.test(code);

  return (
    <Modal
      open
      title="Tạo quy trình mới"
      okText="Tạo bản nháp"
      cancelText="Hủy"
      okButtonProps={{ disabled: !valid, loading }}
      onOk={() => onCreate(code)}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        Chọn loại hồ sơ (hoặc gõ mã mới, dạng CHỮ_HOA). Bản nháp được tạo với một bước mẫu.
      </Typography.Paragraph>
      <AutoComplete
        aria-label="Loại hồ sơ"
        style={{ width: "100%" }}
        value={value}
        onChange={setValue}
        placeholder="vd CONTRACT"
        options={options.map((option) => ({
          value: option.code,
          label: `${option.name} (${option.code})`,
        }))}
        filterOption={(input, option) =>
          String(option?.label ?? "")
            .toLowerCase()
            .includes(input.toLowerCase())
        }
      />
    </Modal>
  );
}

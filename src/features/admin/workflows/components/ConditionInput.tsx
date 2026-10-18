import { useRef } from "react";
import {
  Checkbox,
  Dropdown,
  Flex,
  Input,
  Space,
  Tag,
  Tooltip,
  Typography,
  type InputRef,
} from "antd";
import { DownOutlined } from "@ant-design/icons";

import type { Violation } from "../api/definitions";
import {
  CONDITION_TEMPLATES,
  CONDITION_VARIABLES,
  isProvided,
  missingVariables,
} from "../lib/conditionVariables";

interface Props {
  value: string | null;
  onChange(value: string | null): void;
  documentType: string;
  disabled?: boolean;

  errors?: Violation[];
}

export function ConditionInput({ value, onChange, documentType, disabled, errors = [] }: Props) {
  const inputRef = useRef<InputRef>(null);
  const enabled = value !== null;
  const missing = missingVariables(value, documentType);

  const insert = (text: string) => {
    const element = inputRef.current?.input;
    const current = value ?? "";
    const start = element?.selectionStart ?? current.length;
    const end = element?.selectionEnd ?? current.length;
    onChange(current.slice(0, start) + text + current.slice(end));
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size={4}>
      <Checkbox
        disabled={disabled}
        checked={enabled}
        onChange={(event) => onChange(event.target.checked ? "" : null)}
      >
        Chỉ áp dụng khi…
      </Checkbox>
      {enabled && (
        <>
          <Flex gap={8}>
            <Input
              ref={inputRef}
              aria-label="Điều kiện"
              disabled={disabled}
              status={errors.length > 0 ? "error" : undefined}
              value={value ?? ""}
              maxLength={500}
              showCount
              placeholder="vd amount > 500000000"
              onChange={(event) => onChange(event.target.value)}
              style={{ fontFamily: "monospace" }}
            />
            {!disabled && (
              <Dropdown
                menu={{
                  items: CONDITION_TEMPLATES.map((template) => ({
                    key: template.expression,
                    label: (
                      <span>
                        {template.label} <code>{template.expression}</code>
                      </span>
                    ),
                  })),
                  onClick: ({ key }) => onChange(key),
                }}
              >
                <a style={{ whiteSpace: "nowrap", alignSelf: "center" }}>
                  Mẫu <DownOutlined />
                </a>
              </Dropdown>
            )}
          </Flex>
          {!disabled && (
            <Flex gap={4} wrap align="center">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Biến:
              </Typography.Text>
              {CONDITION_VARIABLES.map((variable) => {
                const provided = isProvided(variable, documentType);
                return (
                  <Tooltip
                    key={variable.name}
                    title={`${variable.label}${provided ? "" : " – loại hồ sơ này không cung cấp"} · ví dụ: ${variable.example}`}
                  >
                    <Tag
                      style={{
                        cursor: "pointer",
                        opacity: provided ? 1 : 0.45,
                        marginInlineEnd: 0,
                      }}
                      onClick={() => insert(variable.name)}
                    >
                      {variable.name}
                    </Tag>
                  </Tooltip>
                );
              })}
            </Flex>
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Cú pháp: <code>== != &gt; &lt; &gt;= &lt;= and or not</code>, chuỗi đặt trong{" "}
            <code>'…'</code>. Không gọi hàm.
          </Typography.Text>
          {missing.length > 0 && (
            <Typography.Text type="warning" style={{ fontSize: 12 }}>
              Loại hồ sơ này không cung cấp biến {missing.join(", ")} – gửi duyệt sẽ lỗi
              WF_CONDITION_ERROR.
            </Typography.Text>
          )}
          {errors.map((error, index) => (
            <Typography.Text key={index} type="danger" style={{ fontSize: 12 }}>
              {error.rule}: {error.message}
            </Typography.Text>
          ))}
        </>
      )}
    </Space>
  );
}

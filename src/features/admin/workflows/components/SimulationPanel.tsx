import { useEffect, useState } from "react";
import { Alert, Button, Form, Input, InputNumber, List, Select, Switch, Typography } from "antd";
import { CheckCircleFilled, MinusCircleOutlined, CloseCircleFilled } from "@ant-design/icons";

import { errorMessage } from "@/shared/lib/problem";

import type { SimulationResult } from "../api/definitions";
import { useSimulateDefinition, useUserSearch } from "../hooks/useDefinitions";
import { CONDITION_VARIABLES, isProvided } from "../lib/conditionVariables";
import { circled } from "../lib/labels";

interface Props {
  definitionId: string;
  documentType: string;
  dirty: boolean;
  onSave(): Promise<boolean>;
}

const STORAGE_PREFIX = "pf.wf-simulate.";

function loadContext(documentType: string): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + documentType) ?? "{}") as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

function SubmitterSelect({
  value,
  onChange,
}: {
  value?: string;
  onChange?(value: string | undefined): void;
}) {
  const [q, setQ] = useState("");
  const users = useUserSearch(q);
  if (users.isError) {
    return (
      <Input
        placeholder="Id người gửi (UUID)"
        value={value}
        onChange={(event) => onChange?.(event.target.value || undefined)}
      />
    );
  }
  return (
    <Select
      showSearch
      allowClear
      filterOption={false}
      onSearch={setQ}
      placeholder="Chọn người gửi"
      value={value}
      onChange={onChange}
      loading={users.isFetching}
      options={(users.data ?? []).map((user) => ({
        value: user.id,
        label: `${user.fullName}${user.departmentCode ? ` · ${user.departmentCode}` : ""}`,
      }))}
    />
  );
}

export function SimulationPanel({ definitionId, documentType, dirty, onSave }: Props) {
  const [form] = Form.useForm();
  const simulate = useSimulateDefinition(definitionId);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const variables = CONDITION_VARIABLES.filter(
    (variable) => variable.providedBy !== null && isProvided(variable, documentType),
  );

  useEffect(() => {
    form.setFieldsValue(loadContext(documentType));
  }, [documentType, form]);

  const run = async (values: Record<string, unknown>) => {
    if (dirty && !(await onSave())) return;
    const { submitterId, ...context } = values;
    const cleaned = Object.fromEntries(
      Object.entries(context).filter(([, value]) => value !== undefined && value !== ""),
    );
    try {
      localStorage.setItem(STORAGE_PREFIX + documentType, JSON.stringify(values));
    } catch {
      return;
    }
    simulate.mutate(
      { context: cleaned, submitterId: (submitterId as string | undefined) ?? null },
      { onSuccess: setResult },
    );
  };

  return (
    <div>
      <Form form={form} layout="vertical" size="small" onFinish={run}>
        <Form.Item name="submitterId" label="Người gửi">
          <SubmitterSelect />
        </Form.Item>
        {variables.map((variable) => (
          <Form.Item
            key={variable.name}
            name={variable.name}
            label={`${variable.label} (${variable.name})`}
            valuePropName={variable.kind === "boolean" ? "checked" : "value"}
          >
            {variable.kind === "number" ? (
              <InputNumber style={{ width: "100%" }} />
            ) : variable.kind === "boolean" ? (
              <Switch />
            ) : variable.name === "currency" ? (
              <Select
                allowClear
                options={["VND", "USD"].map((value) => ({ value, label: value }))}
              />
            ) : (
              <Input allowClear />
            )}
          </Form.Item>
        ))}
        <Button type="primary" htmlType="submit" loading={simulate.isPending}>
          {dirty ? "Lưu và mô phỏng" : "▶ Chạy mô phỏng"}
        </Button>
      </Form>
      {simulate.isError && (
        <Alert
          type="error"
          showIcon
          title={errorMessage(simulate.error)}
          style={{ marginTop: 12 }}
        />
      )}
      {result && (
        <div style={{ marginTop: 16 }} data-testid="simulation-result">
          <List
            size="small"
            dataSource={result.path}
            renderItem={(step) => (
              <List.Item>
                <span>
                  {step.applies ? (
                    <CheckCircleFilled style={{ color: "#389e0d" }} />
                  ) : step.reason === "condition-error" ? (
                    <CloseCircleFilled style={{ color: "#cf1322" }} />
                  ) : (
                    <MinusCircleOutlined style={{ color: "#bfbfbf" }} />
                  )}{" "}
                  {circled(step.order)} {step.name}{" "}
                  <Typography.Text type="secondary">
                    {step.applies
                      ? `→ ${step.assignees.map((person) => person.fullName ?? person.id).join(", ") || "không có người duyệt"}`
                      : step.reason === "condition-error"
                        ? "lỗi điều kiện"
                        : "bỏ qua (điều kiện = false)"}
                  </Typography.Text>
                </span>
              </List.Item>
            )}
          />
          {result.warnings.map((warning, index) => (
            <Alert key={index} type="warning" showIcon title={warning} style={{ marginTop: 8 }} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Alert, App, Input, List, Modal, Space, Spin, Typography } from "antd";
import { useNavigate } from "react-router-dom";

import { documentTypeLabel } from "@/shared/lib/statusLabels";
import { errorMessage } from "@/shared/lib/problem";

import type { DefinitionResponse } from "../api/definitions";
import {
  useActivateDefinition,
  useRunningInstances,
  useValidateDefinition,
} from "../hooks/useDefinitions";
import { diffDefinitions } from "../lib/diffDefinitions";

interface Props {
  definition: DefinitionResponse;

  currentActive?: DefinitionResponse;
  onClose(): void;
}

export function ActivateModal({ definition, currentActive, onClose }: Props) {
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const validate = useValidateDefinition(definition.id);
  const activate = useActivateDefinition(definition.id);
  const running = useRunningInstances(currentActive?.id, !!currentActive);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    validate.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const violations = validate.data?.violations ?? [];
  const errors = violations.filter((violation) => violation.severity === "ERROR");
  const warnings = violations.filter((violation) => violation.severity === "WARNING");
  const valid = validate.data?.valid === true && errors.length === 0;
  const changes = currentActive
    ? diffDefinitions(currentActive.definition, definition.definition)
    : [];
  const confirmed = typed.trim() === definition.documentType;

  return (
    <Modal
      open
      title={`Kích hoạt quy trình ${documentTypeLabel(definition.documentType)} v${definition.version}`}
      okText="Kích hoạt"
      cancelText="Hủy"
      onCancel={onClose}
      okButtonProps={{ disabled: !valid || !confirmed, loading: activate.isPending }}
      onOk={() =>
        activate.mutate(undefined, {
          onSuccess: (result) => {
            notification.success({
              title: `Activated ${documentTypeLabel(definition.documentType)} v${definition.version}`,
              description:
                result.runningInstancesOnOldVersions > 0
                  ? `${result.runningInstancesOnOldVersions} hồ sơ đang chạy tiếp tục theo version cũ cho đến khi xong.`
                  : "Hồ sơ gửi duyệt từ bây giờ dùng version này.",
            });
            onClose();
            navigate(`/admin/workflows/${result.definition.id}`, { replace: true });
          },
          onError: (error) =>
            notification.error({ title: "Activation failed", description: errorMessage(error) }),
        })
      }
      destroyOnHidden
      width={640}
    >
      {validate.isPending ? (
        <Spin />
      ) : validate.isError ? (
        <Alert type="error" showIcon title={errorMessage(validate.error)} />
      ) : (
        <Space orientation="vertical" style={{ width: "100%" }} size={12}>
          {errors.length > 0 ? (
            <Alert
              type="error"
              showIcon
              title={`${errors.length} error(s) remaining – cannot activate yet`}
              description={
                <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                  {errors.map((error, index) => (
                    <li key={index}>
                      <b>{error.rule}</b> {error.path && <code>{error.path}</code>} {error.message}
                    </li>
                  ))}
                </ul>
              }
            />
          ) : (
            <Alert
              type="success"
              showIcon
              title={`Kiểm tra: không có lỗi${warnings.length ? ` (${warnings.length} cảnh báo: ${warnings.map((w) => w.rule).join(", ")})` : ""}`}
            />
          )}
          {currentActive ? (
            <div>
              <Typography.Text strong>
                Thay đổi so với v{currentActive.version} (đang áp dụng):
              </Typography.Text>
              {changes.length === 0 ? (
                <Typography.Paragraph type="secondary">
                  Không có khác biệt về nội dung.
                </Typography.Paragraph>
              ) : (
                <List
                  size="small"
                  dataSource={changes}
                  renderItem={(change) => (
                    <List.Item>
                      <Typography.Text
                        type={
                          change.kind === "removed"
                            ? "danger"
                            : change.kind === "added"
                              ? "success"
                              : undefined
                        }
                      >
                        {change.kind === "added" ? "+ " : change.kind === "removed" ? "− " : "~ "}
                        {change.text}
                      </Typography.Text>
                    </List.Item>
                  )}
                />
              )}
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 8 }}
                title={
                  running.data !== undefined
                    ? `${running.data} hồ sơ đang chạy theo v${currentActive.version} sẽ tiếp tục theo v${currentActive.version} cho đến khi xong.`
                    : `Hồ sơ đang chạy theo v${currentActive.version} tiếp tục theo version đó cho đến khi xong.`
                }
                description={`Documents submitted from now on will use v${definition.version}. v${currentActive.version} will be set to "Ngừng áp dụng".`}
              />
            </div>
          ) : (
            <Alert type="info" showIcon title="This document type has no active workflow yet." />
          )}
          {valid && (
            <div>
              <Typography.Text>
                Gõ <b>{definition.documentType}</b> để xác nhận:
              </Typography.Text>
              <Input
                aria-label="Mã loại hồ sơ để xác nhận"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                status={typed && !confirmed ? "error" : undefined}
              />
            </div>
          )}
        </Space>
      )}
    </Modal>
  );
}

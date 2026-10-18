import { useEffect } from "react";
import { Alert, App, Form, Input, Modal, Typography } from "antd";

import { useConflictModal } from "@/shared/components/feedback/useConflictModal";
import { errorCodeOf, errorMessage, isConflict } from "@/shared/lib/problem";

import type { ActionResponse, ApprovalActionType, InstanceView } from "../api/workflow";
import { useActingOnBehalfOf, useApprovalAction } from "../hooks/useWorkflow";

interface Props {
  instance: InstanceView;
  action: ApprovalActionType | null;
  onClose(): void;
  onDone?(result: ActionResponse): void;

  invalidate?: readonly (readonly unknown[])[];
}

const TITLES: Record<ApprovalActionType, string> = {
  APPROVE: "Duyệt hồ sơ",
  REQUEST_REVISION: "Yêu cầu sửa",
  REJECT: "Từ chối hồ sơ",
};

const OK_TEXT: Record<ApprovalActionType, string> = {
  APPROVE: "Duyệt",
  REQUEST_REVISION: "Gửi yêu cầu sửa",
  REJECT: "Từ chối",
};

export function ApprovalActionModal({ instance, action, onClose, onDone, invalidate }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ comment?: string }>();
  const mutation = useApprovalAction(invalidate);
  const showConflict = useConflictModal();
  const onBehalfOf = useActingOnBehalfOf(instance);

  const current = instance.steps.find((step) => step.state === "CURRENT");
  const next = instance.steps.find((step) => step.state === "REMAINING");
  const commentRequired = action !== null && action !== "APPROVE";

  useEffect(() => {
    if (action) {
      form.resetFields();
      mutation.resetKey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  if (!action || !current?.id) return null;

  const consequence = (() => {
    if (action === "APPROVE") {
      if (current.requiresAll)
        return "This step requires all assignees to approve – your vote will be recorded.";
      return next ? (
        <>
          Hồ sơ chuyển sang bước <b>{next.name}</b>.
        </>
      ) : (
        "Đây là bước cuối – hồ sơ sẽ được duyệt."
      );
    }
    if (action === "REQUEST_REVISION") {
      return (
        <>
          Hồ sơ trả về <b>{instance.submitter.fullName ?? "người gửi"}</b> để sửa rồi gửi lại.
        </>
      );
    }
    if (current.onReject === "TERMINATE") {
      return (
        <>
          Hồ sơ <b>kết thúc</b>, không gửi lại được (muốn làm lại phải tạo hồ sơ mới).
        </>
      );
    }
    if (current.onReject === "BACK_TO_SUBMITTER") {
      return (
        <>
          Hồ sơ trả về <b>{instance.submitter.fullName ?? "người gửi"}</b> để sửa.
        </>
      );
    }
    return "Tùy cấu hình bước: hồ sơ kết thúc hoặc trả về người gửi để sửa.";
  })();

  const submit = (values: { comment?: string }) => {
    mutation.mutate(
      {
        instanceId: instance.id,
        stepId: current.id!,
        action,
        comment: values.comment?.trim(),
        expectedVersion: instance.version,
      },
      {
        onSuccess: (result) => {
          message.success(
            action === "APPROVE"
              ? result.status === "APPROVED"
                ? "Approved – the document has completed the workflow."
                : result.currentStep
                  ? `Approved – moved to step ${result.currentStep.name}.`
                  : "Your vote has been recorded."
              : action === "REJECT"
                ? "Document rejected."
                : "Revision request sent.",
          );
          onClose();
          onDone?.(result);
        },
        onError: (error) => {
          if (isConflict(error)) {
            onClose();
            showConflict(error, () => undefined);
          } else if (errorCodeOf(error) === "WF_COMMENT_REQUIRED") {
            form.setFields([{ name: "comment", errors: [errorMessage(error)] }]);
          } else {
            message.error(errorMessage(error));
          }
        },
      },
    );
  };

  return (
    <Modal
      open
      title={TITLES[action]}
      okText={OK_TEXT[action]}
      okButtonProps={{ danger: action === "REJECT", loading: mutation.isPending }}
      cancelText="Đóng"
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Typography.Paragraph style={{ marginBottom: 8 }}>
        {instance.document.number ?? "Hồ sơ"} · bước <b>{current.name}</b>
        {onBehalfOf && <Typography.Text type="secondary"> – thay mặt {onBehalfOf}</Typography.Text>}
      </Typography.Paragraph>
      <Alert
        type={action === "REJECT" ? "warning" : action === "APPROVE" ? "info" : "warning"}
        showIcon
        title={consequence}
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item
          name="comment"
          label={commentRequired ? "Nhận xét (bắt buộc)" : "Nhận xét (tùy chọn)"}
          rules={
            commentRequired
              ? [{ required: true, whitespace: true, message: "Please enter a comment" }]
              : []
          }
        >
          <Input.TextArea
            rows={4}
            maxLength={2000}
            showCount
            autoFocus
            placeholder={
              commentRequired
                ? "Describe what needs to change or the reason for rejection"
                : "e.g. Agreed"
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

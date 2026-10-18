import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Dropdown,
  Skeleton,
  Space,
  Tabs,
  Tag,
  type MenuProps,
} from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { Link, useParams } from "react-router-dom";

import { usePermission } from "@/features/auth";
import {
  fromInstanceHistory,
  HistoryTimeline,
  useWorkflowOfDocument,
  WorkflowProgressCard,
} from "@/features/workflow";
import { ReasonModal } from "@/shared/components/feedback/ReasonModal";
import { DocumentHeader } from "@/shared/components/document/DocumentHeader";
import { DocumentLayout } from "@/shared/components/document/DocumentLayout";
import { StatusTag } from "@/shared/components/status/StatusTag";
import { daysFromToday, formatDate, formatDateTime } from "@/shared/lib/format";
import { errorMessage } from "@/shared/lib/problem";

import { fetchAddendumPdf, type AddendumResponse } from "../api/addenda";
import type { ContractResponse } from "../api/contracts";
import { AddendumChangesView } from "../components/AddendumChangesView";
import { AddendumDrawer } from "../components/AddendumDrawer";
import { PdfPreviewButton } from "../components/PdfPreviewButton";
import { LoadErrorResult } from "../components/NotFoundResult";
import {
  useAddendum,
  useCancelAddendum,
  useInvalidateAddendum,
  useSubmitAddendum,
} from "../hooks/useAddenda";
import { useContract, useServices } from "../hooks/useContracts";
import { contractKeys } from "../hooks/queryKeys";
import { addendumActions } from "../lib/addendumActions";
import { fromAddendum } from "../lib/addendumPayload";
import { ADDENDUM_TYPES } from "../lib/labels";

export function AddendumDetailPage() {
  const { id } = useParams();
  const addendum = useAddendum(id);
  const contract = useContract(addendum.data?.contractId);
  if (addendum.isLoading || (addendum.data && contract.isLoading))
    return <Skeleton active paragraph={{ rows: 8 }} />;
  if (addendum.isError || !addendum.data) {
    return (
      <LoadErrorResult
        error={addendum.error}
        backTo="/contracts"
        backLabel="Về danh sách hợp đồng"
      />
    );
  }
  if (contract.isError || !contract.data) {
    return (
      <LoadErrorResult
        error={contract.error}
        backTo="/contracts"
        backLabel="Về danh sách hợp đồng"
      />
    );
  }
  return <AddendumDetail addendum={addendum.data} contract={contract.data} />;
}

function AddendumDetail({
  addendum,
  contract,
}: {
  addendum: AddendumResponse;
  contract: ContractResponse;
}) {
  const { message, modal } = App.useApp();
  const permissions = {
    create: usePermission("Addendum.Create"),
    submit: usePermission("Addendum.Submit"),
  };
  const actions = addendumActions(addendum, permissions);
  const services = useServices();
  const workflow = useWorkflowOfDocument("ADDENDUM", addendum.id);
  const submit = useSubmitAddendum();
  const cancel = useCancelAddendum();
  const invalidate = useInvalidateAddendum();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const meta = ADDENDUM_TYPES[addendum.type];
  const history = workflow.data?.history ?? [];
  const lastDecision = [...history]
    .reverse()
    .find((item) => item.action === "REQUEST_REVISION" || item.action === "REJECT");

  const doSubmit = () =>
    modal.confirm({
      title: `${addendum.status === "REVISION_REQUESTED" ? "Gửi lại" : "Gửi duyệt"} ${addendum.number}?`,
      okText: "Gửi duyệt",
      cancelText: "Đóng",
      onOk: async () => {
        submit.resetKey();
        try {
          const response = await submit.mutateAsync(addendum.id);
          const holder = response.workflow.currentStep?.assignees
            .map((person) => person.fullName)
            .join(", ");
          message.success(
            holder ? `Submitted for approval – waiting for ${holder}` : "Submitted for approval",
          );
        } catch (error) {
          message.error(errorMessage(error));
        } finally {
          invalidate(addendum.id, contract.id);
        }
      },
    });

  const banner = (() => {
    switch (addendum.status) {
      case "APPROVED": {
        const days = daysFromToday(addendum.effectiveFrom);
        return (
          <Alert
            type="info"
            showIcon
            title={`Approved – will be applied to the contract automatically on ${formatDate(addendum.effectiveFrom)}${days > 0 ? ` (${days} days left)` : ""}.`}
          />
        );
      }
      case "APPLIED":
        return (
          <Alert
            type="success"
            showIcon
            title={`Applied at ${formatDateTime(addendum.appliedAt)}.`}
            action={
              <Space direction="vertical" size={4}>
                <Link to={`/contracts/${contract.id}?tab=terms&at=${addendum.effectiveFrom}`}>
                  Xem điều khoản tại ngày
                </Link>
                {addendum.type === "PRICE_CHANGE" && (
                  <Link to={`/pricing?scope=CONTRACT&scopeId=${contract.id}`}>
                    Xem bảng giá hợp đồng
                  </Link>
                )}
              </Space>
            }
          />
        );
      case "REVISION_REQUESTED":
        return (
          <Alert
            type="warning"
            showIcon
            title={
              lastDecision
                ? `${lastDecision.user.fullName ?? "Người duyệt"} yêu cầu sửa (${lastDecision.stepName})`
                : "Phụ lục được trả về để sửa."
            }
            description={lastDecision?.comment ? `“${lastDecision.comment}”` : undefined}
          />
        );
      case "REJECTED":
        return (
          <Alert
            type="error"
            showIcon
            title="Addendum rejected."
            description={lastDecision?.comment ? `“${lastDecision.comment}”` : undefined}
          />
        );
      case "CANCELLED":
        return <Alert type="info" showIcon title={`Cancelled: ${addendum.cancelReason ?? "—"}`} />;
      default:
        return null;
    }
  })();

  const menu: MenuProps["items"] = actions.includes("CANCEL")
    ? [{ key: "cancel", label: "Hủy phụ lục", danger: true, onClick: () => setCancelOpen(true) }]
    : [];

  return (
    <>
      <DocumentHeader
        backTo={{
          path: `/contracts/${contract.id}?tab=addenda`,
          label: `${contract.number} · ${contract.customerName ?? ""}`,
        }}
        title={addendum.number}
        tags={
          <>
            <Tag color={meta.color}>{meta.label}</Tag>
            <StatusTag
              kind="ADDENDUM"
              status={addendum.status === "SUBMITTED" ? "UNDER_REVIEW" : addendum.status}
            />
          </>
        }
        subtitle={`Hiệu lực từ ${formatDate(addendum.effectiveFrom)} · rev ${addendum.revision}`}
        actions={
          <>
            {actions.includes("SUBMIT") && (
              <Button type="primary" onClick={doSubmit} loading={submit.isPending}>
                {addendum.status === "REVISION_REQUESTED" ? "Gửi lại" : "Gửi duyệt"}
              </Button>
            )}
            {actions.includes("UPDATE") && <Button onClick={() => setEditOpen(true)}>Sửa</Button>}
            <PdfPreviewButton
              load={() => fetchAddendumPdf(addendum.id)}
              draft={!["APPROVED", "APPLIED"].includes(addendum.status)}
            />
            {menu.length > 0 && (
              <Dropdown menu={{ items: menu }} trigger={["click"]}>
                <Button icon={<MoreOutlined />} aria-label="Thêm thao tác">
                  Thêm
                </Button>
              </Dropdown>
            )}
          </>
        }
      />
      {banner && <div style={{ marginBottom: 16 }}>{banner}</div>}
      <DocumentLayout
        main={
          <Card size="small">
            <Tabs
              items={[
                {
                  key: "changes",
                  label: "Nội dung",
                  children: (
                    <AddendumChangesView
                      draft={fromAddendum(addendum)}
                      contract={contract}
                      catalog={services.data}
                      applied={addendum.status === "APPLIED"}
                    />
                  ),
                },
                {
                  key: "history",
                  label: "Lịch sử",
                  children: <HistoryTimeline entries={fromInstanceHistory(history)} />,
                },
              ]}
            />
          </Card>
        }
        side={
          <WorkflowProgressCard
            documentType="ADDENDUM"
            documentId={addendum.id}
            invalidate={[
              contractKeys.addendum(addendum.id),
              contractKeys.detail(contract.id),
              contractKeys.addenda(contract.id),
            ]}
          />
        }
      />
      {editOpen && (
        <AddendumDrawer
          contract={contract}
          addendum={addendum}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
      <ReasonModal
        open={cancelOpen}
        title={`Cancel ${addendum.number}`}
        danger
        okText="Hủy phụ lục"
        loading={cancel.isPending}
        description={
          addendum.status === "APPROVED"
            ? "Phụ lục đã duyệt nhưng chưa áp dụng – hủy thì sẽ không được áp dụng vào hợp đồng."
            : "Nếu đang duyệt, quy trình duyệt sẽ dừng."
        }
        onCancel={() => setCancelOpen(false)}
        onSubmit={async (reason) => {
          cancel.resetKey();
          try {
            await cancel.mutateAsync({ id: addendum.id, reason });
            message.success("Addendum cancelled");
            setCancelOpen(false);
          } catch (error) {
            message.error(errorMessage(error));
          } finally {
            invalidate(addendum.id, contract.id);
          }
        }}
      />
    </>
  );
}

import { useState } from "react";
import {
  App,
  Button,
  Card,
  Descriptions,
  Dropdown,
  Input,
  Modal,
  Skeleton,
  Space,
  Tabs,
  Typography,
  type MenuProps,
} from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { usePermission } from "@/features/auth";
import { HistoryTimeline, WorkflowProgressCard } from "@/features/workflow";
import { DateText, DateTimeText } from "@/shared/components/data/DateText";
import { MoneyText } from "@/shared/components/data/MoneyText";
import { ReasonModal } from "@/shared/components/feedback/ReasonModal";
import { DocumentHeader } from "@/shared/components/document/DocumentHeader";
import { DocumentLayout } from "@/shared/components/document/DocumentLayout";
import { SigningTag, StatusTag } from "@/shared/components/status/StatusTag";
import { daysFromToday, formatDateRange } from "@/shared/lib/format";
import { errorCodeOf, errorMessage } from "@/shared/lib/problem";

import type { AddendumType } from "../api/addenda";
import { fetchContractPdf, type ContractResponse } from "../api/contracts";
import { AddendaTab } from "../components/AddendaTab";
import { AddendumDrawer } from "../components/AddendumDrawer";
import { AttachmentsPanel } from "../components/AttachmentsPanel";
import { ContractStatusBanner } from "../components/ContractStatusBanner";
import { PdfPreviewButton } from "../components/PdfPreviewButton";
import { LoadErrorResult } from "../components/NotFoundResult";
import { ServicesTable } from "../components/ServicesTable";
import { TermsAtDate } from "../components/TermsAtDate";
import { VersionsTab } from "../components/VersionsTab";
import { useAddenda } from "../hooks/useAddenda";
import {
  useCancelContract,
  useCloneContract,
  useContract,
  useContractHistory,
  useCustomerOption,
  useDeleteContract,
  useInvalidateContract,
  usePatchTitle,
  useServiceGroups,
  useServices,
  useSubmitContract,
} from "../hooks/useContracts";
import { contractKeys } from "../hooks/queryKeys";
import { toTimeline } from "../lib/history";
import { paymentMethodLabel } from "../lib/labels";
import { isReady, readinessItems } from "../lib/readiness";

export function ContractDetailPage() {
  const { id } = useParams();
  const query = useContract(id);
  if (query.isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (query.isError || !query.data) {
    return (
      <LoadErrorResult error={query.error} backTo="/contracts" backLabel="Về danh sách hợp đồng" />
    );
  }
  return <ContractDetail contract={query.data} />;
}

function ContractDetail({ contract }: { contract: ContractResponse }) {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const canReadCustomer = usePermission("Customer.Read");
  const history = useContractHistory(contract.id);
  const addenda = useAddenda(contract.id);
  const services = useServices();
  const groups = useServiceGroups();
  const invalidate = useInvalidateContract();
  const submit = useSubmitContract();
  const cancel = useCancelContract();
  const clone = useCloneContract();
  const remove = useDeleteContract();
  const patchTitle = usePatchTitle();
  const needsCustomerStatus =
    contract.customerStatus === undefined &&
    (contract.status === "DRAFT" || contract.status === "REVISION_REQUESTED");
  const customer = useCustomerOption(contract.customerId, needsCustomerStatus && canReadCustomer);
  const customerStatus = contract.customerStatus ?? customer.data?.status;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(contract.title);
  const [addendumType, setAddendumType] = useState<AddendumType | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const can = (action: ContractResponse["allowedActions"][number]) =>
    contract.allowedActions.includes(action);
  const tab = params.get("tab") ?? "info";
  const historyItems = history.data ?? [];

  const openAddendum = (type?: AddendumType) => {
    setAddendumType(type);
    setDrawerOpen(true);
  };

  const doSubmit = () => {
    const readiness = readinessItems({
      customerActive: customerStatus ? customerStatus === "ACTIVE" : undefined,
      datesValid: contract.effectiveFrom <= contract.effectiveTo,
      serviceCount: contract.services.length,
      attachmentCount: contract.attachments.length,
      serviceTerms: contract.serviceTerms,
    });
    const missing = readiness.filter((item) => item.ok === false);
    if (missing.length > 0 || !isReady(readiness.filter((item) => item.key !== "customer"))) {
      modal.warning({
        title: "Not ready to submit for approval",
        content: (
          <ul style={{ paddingInlineStart: 20, margin: 0 }}>
            {readiness
              .filter((item) => item.ok !== true)
              .map((item) => (
                <li key={item.key}>{item.label}</li>
              ))}
          </ul>
        ),
        okText: can("UPDATE") ? "Sửa hợp đồng" : "Đóng",
        onOk: () => {
          if (can("UPDATE")) navigate(`/contracts/${contract.id}/edit`);
        },
      });
      return;
    }
    modal.confirm({
      title: `Submit ${contract.number} for approval?`,
      content: "Hợp đồng sẽ chuyển tới người duyệt bước đầu. Trong lúc duyệt không sửa được.",
      okText: "Gửi duyệt",
      cancelText: "Đóng",
      onOk: async () => {
        submit.resetKey();
        try {
          const response = await submit.mutateAsync(contract.id);
          const holder = response.workflow.currentStep?.assignees
            .map((person) => person.fullName)
            .join(", ");
          message.success(
            holder ? `Submitted for approval – waiting for ${holder}` : "Submitted for approval",
          );
        } catch (error) {
          message.error(errorMessage(error));
          if (errorCodeOf(error) === "CTR_ATTACHMENT_REQUIRED") {
            setParams({ tab: "files" });
          }
        }
      },
    });
  };

  const doClone = () =>
    modal.confirm({
      title: "Duplicate as a new contract?",
      content:
        "Hợp đồng mới ở trạng thái Nháp, số mới, giữ liên kết tới hợp đồng này (CTR-04). Tệp đính kèm không được chép.",
      okText: "Nhân bản",
      cancelText: "Đóng",
      onOk: async () => {
        clone.resetKey();
        try {
          const copy = await clone.mutateAsync(contract.id);
          message.success(`Created ${copy.number}`);
          navigate(`/contracts/${copy.id}/edit`);
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });

  const doDelete = () =>
    modal.confirm({
      title: `Delete draft ${contract.number}?`,
      content: "Không khôi phục được.",
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await remove.mutateAsync(contract.id);
          message.success("Draft contract deleted");
          navigate("/contracts");
        } catch (error) {
          message.error(errorMessage(error));
          invalidate(contract.id);
        }
      },
    });

  const primary: React.ReactNode[] = [];
  if (can("SUBMIT") && contract.status === "REVISION_REQUESTED" && can("UPDATE")) {
    primary.push(
      <Button
        key="resubmit"
        type="primary"
        onClick={() => navigate(`/contracts/${contract.id}/edit`)}
      >
        Sửa & gửi lại
      </Button>,
    );
  } else {
    if (can("SUBMIT")) {
      primary.push(
        <Button key="submit" type="primary" onClick={doSubmit} loading={submit.isPending}>
          Gửi duyệt
        </Button>,
      );
    }
    if (can("UPDATE")) {
      primary.push(
        <Button key="edit" onClick={() => navigate(`/contracts/${contract.id}/edit`)}>
          Sửa
        </Button>,
      );
    }
  }
  if (can("CREATE_ADDENDUM")) {
    primary.push(
      <Button key="addendum" onClick={() => openAddendum()}>
        Tạo phụ lục
      </Button>,
    );
  }
  const cloneIsPrimary = contract.status === "REJECTED" && can("CLONE");
  if (cloneIsPrimary) {
    primary.push(
      <Button key="clone" type="primary" onClick={doClone}>
        Nhân bản thành hợp đồng mới
      </Button>,
    );
  }
  const menu: MenuProps["items"] = [
    ...(can("PATCH_METADATA")
      ? [{ key: "title", label: "Sửa tiêu đề", onClick: () => setTitleOpen(true) }]
      : []),
    ...(can("CLONE") && !cloneIsPrimary
      ? [{ key: "clone", label: "Nhân bản thành hợp đồng mới", onClick: doClone }]
      : []),
    ...(can("DELETE")
      ? [{ key: "delete", label: "Xóa nháp", danger: true, onClick: doDelete }]
      : []),
    ...(can("CANCEL")
      ? [{ key: "cancel", label: "Hủy hợp đồng", danger: true, onClick: () => setCancelOpen(true) }]
      : []),
  ];

  const duration =
    Math.round(
      (new Date(contract.effectiveTo).getTime() - new Date(contract.effectiveFrom).getTime()) /
        86_400_000,
    ) + 1;

  return (
    <>
      <DocumentHeader
        backTo={{ path: "/contracts", label: "Hợp đồng" }}
        title={contract.number}
        tags={
          <>
            <StatusTag
              kind="CONTRACT"
              status={contract.status === "SUBMITTED" ? "UNDER_REVIEW" : contract.status}
            />
            <SigningTag state={contract.signingState} />
          </>
        }
        subtitle={
          <>
            {contract.title} ·{" "}
            <Link to={`/customers/${contract.customerId}`}>
              {contract.customerName ?? "Khách hàng"}
            </Link>{" "}
            · rev {contract.revision}
            {contract.supersedesContractId && (
              <>
                {" "}
                ·{" "}
                <Link to={`/contracts/${contract.supersedesContractId}`}>thay thế hợp đồng cũ</Link>
              </>
            )}
          </>
        }
        actions={
          <>
            {primary}
            <PdfPreviewButton
              load={() => fetchContractPdf(contract.id)}
              draft={!["APPROVED", "ACTIVE", "EXPIRED"].includes(contract.status)}
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
      <ContractStatusBanner
        contract={contract}
        history={historyItems}
        customerStatus={customerStatus}
        onEdit={() => navigate(`/contracts/${contract.id}/edit`)}
        onClone={doClone}
        onExtend={() => openAddendum("EXTENSION")}
      />

      <DocumentLayout
        main={
          <Card size="small">
            <Tabs
              activeKey={tab}
              onChange={(key) => setParams({ tab: key }, { replace: true })}
              items={[
                {
                  key: "info",
                  label: "Thông tin",
                  children: (
                    <Descriptions column={{ xs: 1, md: 2 }} size="small" bordered>
                      <Descriptions.Item label="Khách hàng" span={2}>
                        <Link to={`/customers/${contract.customerId}`}>
                          {contract.customerName ?? contract.customerId}
                        </Link>
                      </Descriptions.Item>
                      <Descriptions.Item label="Hiệu lực" span={2}>
                        {formatDateRange(contract.effectiveFrom, contract.effectiveTo)} ({duration}{" "}
                        ngày)
                      </Descriptions.Item>
                      <Descriptions.Item label="Giá trị">
                        <MoneyText
                          value={contract.value.amount}
                          currency={contract.value.currency}
                          strong
                        />
                      </Descriptions.Item>
                      <Descriptions.Item label="Thanh toán">
                        {contract.paymentTerms.paymentDays} ngày ·{" "}
                        {paymentMethodLabel(contract.paymentTerms.method)}
                        {contract.paymentTerms.note && <div>“{contract.paymentTerms.note}”</div>}
                      </Descriptions.Item>
                      <Descriptions.Item label="Ký điện tử">
                        {contract.requiresESign ? (
                          <>
                            Cần ký <SigningTag state={contract.signingState} />
                          </>
                        ) : (
                          "Không cần ký"
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Approved">
                        <DateTimeText value={contract.approvedAt} />
                      </Descriptions.Item>
                      <Descriptions.Item label="Có hiệu lực lúc">
                        <DateTimeText value={contract.activatedAt} />
                      </Descriptions.Item>
                      <Descriptions.Item label="Cập nhật">
                        <DateTimeText value={contract.updatedAt} />
                      </Descriptions.Item>
                      <Descriptions.Item label="Điều khoản dịch vụ" span={2}>
                        <Typography.Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                          {contract.serviceTerms || "—"}
                        </Typography.Paragraph>
                      </Descriptions.Item>
                      {contract.status === "ACTIVE" && (
                        <Descriptions.Item label="Còn lại" span={2}>
                          {daysFromToday(contract.effectiveTo)} ngày (đến{" "}
                          <DateText value={contract.effectiveTo} />)
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  ),
                },
                {
                  key: "services",
                  label: `Dịch vụ (${contract.services.length})`,
                  children: (
                    <ServicesTable
                      rows={contract.services}
                      catalog={services.data ?? []}
                      groups={groups.data ?? []}
                    />
                  ),
                },
                {
                  key: "addenda",
                  label: `Phụ lục (${addenda.data?.length ?? 0})`,
                  children: (
                    <AddendaTab
                      addenda={addenda.data ?? []}
                      loading={addenda.isLoading}
                      currency={contract.value.currency}
                      onCreate={can("CREATE_ADDENDUM") ? () => openAddendum() : undefined}
                    />
                  ),
                },
                {
                  key: "versions",
                  label: `Phiên bản (${contract.revision})`,
                  children: <VersionsTab contractId={contract.id} />,
                },
                {
                  key: "terms",
                  label: "Điều khoản theo ngày",
                  children: (
                    <TermsAtDate contract={contract} initialDate={params.get("at") ?? undefined} />
                  ),
                },
                {
                  key: "files",
                  label: `Tệp (${contract.attachments.length})`,
                  children: (
                    <AttachmentsPanel
                      entityType="CONTRACT"
                      entityId={contract.id}
                      attachments={contract.attachments}
                      canUpload={can("UPLOAD_ATTACHMENT")}
                      onUploaded={() => invalidate(contract.id)}
                    />
                  ),
                },
                {
                  key: "history",
                  label: "Lịch sử",
                  children: <HistoryTimeline entries={toTimeline(historyItems)} />,
                },
              ]}
            />
          </Card>
        }
        side={
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <WorkflowProgressCard
              documentType="CONTRACT"
              documentId={contract.id}
              invalidate={[contractKeys.detail(contract.id), contractKeys.history(contract.id)]}
            />
            <Card size="small" title="Hoạt động gần đây">
              <HistoryTimeline entries={toTimeline(historyItems)} limit={5} />
            </Card>
          </Space>
        }
      />

      <ReasonModal
        open={cancelOpen}
        title={`Cancel contract ${contract.number}`}
        danger
        okText="Hủy hợp đồng"
        minLength={contract.status === "ACTIVE" ? 10 : 1}
        loading={cancel.isPending}
        description="Addenda under review or approved but not yet applied will be cancelled too. This cannot be undone."
        onCancel={() => setCancelOpen(false)}
        onSubmit={async (reason) => {
          cancel.resetKey();
          try {
            await cancel.mutateAsync({ id: contract.id, reason });
            message.success("Contract cancelled");
            setCancelOpen(false);
          } catch (error) {
            message.error(errorMessage(error));
          }
        }}
      />
      <Modal
        open={titleOpen}
        title="Sửa tiêu đề"
        okText="Lưu"
        cancelText="Đóng"
        confirmLoading={patchTitle.isPending}
        destroyOnHidden
        onCancel={() => setTitleOpen(false)}
        onOk={async () => {
          try {
            await patchTitle.mutateAsync({ id: contract.id, title: newTitle.trim() });
            message.success("Title updated");
            setTitleOpen(false);
          } catch (error) {
            message.error(errorMessage(error));
          }
        }}
      >
        <Typography.Paragraph type="secondary">
          Hợp đồng đã duyệt chỉ đổi được tiêu đề; giá trị, thời hạn, thanh toán, dịch vụ phải đổi
          bằng phụ lục (CTR-07).
        </Typography.Paragraph>
        <Input
          aria-label="Tiêu đề mới"
          value={newTitle}
          maxLength={255}
          onChange={(event) => setNewTitle(event.target.value)}
        />
      </Modal>
      {drawerOpen && (
        <AddendumDrawer
          contract={contract}
          open={drawerOpen}
          initialType={addendumType}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}

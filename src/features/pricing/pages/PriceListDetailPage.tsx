import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Dropdown,
  Empty,
  Flex,
  Result,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { EditOutlined, LockOutlined, MoreOutlined, PaperClipOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useSession } from "@/features/auth";
import { uomLabel } from "@/features/catalog/api/catalog";
import { useServiceGroups, useServices } from "@/features/catalog/hooks/useCatalog";
import {
  HistoryTimeline,
  WorkflowProgressCard,
  fromInstanceHistory,
  useWorkflowInstancesOfDocument,
} from "@/features/workflow";
import { DateRangeText } from "@/shared/components/data/DateText";
import { MoneyText } from "@/shared/components/data/MoneyText";
import { DocumentHeader } from "@/shared/components/document/DocumentHeader";
import { DocumentLayout } from "@/shared/components/document/DocumentLayout";
import { useConflictModal } from "@/shared/components/feedback/useConflictModal";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { StatusTag } from "@/shared/components/status/StatusTag";
import { formatDate, formatNumber } from "@/shared/lib/format";
import { errorCodeOf, errorMessage, isConflict, statusOf } from "@/shared/lib/problem";

import type { PriceLine, PriceListDetail } from "../api/priceLists";
import { CompareTable } from "../components/CompareTable";
import { HeaderDrawer } from "../components/HeaderDrawer";
import { NewVersionModal } from "../components/NewVersionModal";
import { PriceLinesEditor } from "../components/PriceLinesEditor";
import { lineProblems, newLine, toLineInputs, type EditableLine } from "../lines";
import { ScopeTag, ScopeTargetLabel } from "../components/ScopeTag";
import { VersionTimeline } from "../components/VersionTimeline";
import { expectedApprovalSteps, maxDecreasePct, priceListActions } from "../domain";
import {
  pricingKeys,
  useCancelPriceList,
  useComparison,
  usePriceList,
  usePriceListVersions,
  useReplaceLines,
  useRevisePriceList,
  useSubmitPriceList,
} from "../hooks/usePricing";
import { LINE_ERROR_CODES, lineErrorCodes } from "../lineErrors";

function useLastRejection(id: string) {
  const instances = useWorkflowInstancesOfDocument("PRICE_LIST", id);
  const entries = (instances.data ?? []).flatMap((instance) => instance.history);
  return entries
    .filter((entry) => entry.action === "REQUEST_REVISION" || entry.action === "REJECT")
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

function LinesTable({ detail }: { detail: PriceListDetail }) {
  const comparison = useComparison(
    detail.previousVersionId ?? undefined,
    detail.previousVersionId ? detail.id : undefined,
  );
  const changes = new Map((comparison.data?.lines ?? []).map((line) => [line.serviceCode, line]));
  return (
    <Table<PriceLine>
      rowKey="serviceCode"
      size="middle"
      pagination={false}
      dataSource={detail.lines}
      scroll={{ x: 640 }}
      locale={{
        emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dòng giá." />,
      }}
      columns={[
        {
          title: "Dịch vụ",
          key: "service",
          render: (_, line) => (
            <div>
              <Typography.Text code>{line.serviceCode}</Typography.Text>
              {line.serviceName && (
                <div>
                  <Typography.Text type="secondary">{line.serviceName}</Typography.Text>
                </div>
              )}
            </div>
          ),
        },
        { title: "ĐVT", dataIndex: "uom", render: (uom: string) => uomLabel(uom) },
        {
          title: "Đơn giá",
          dataIndex: "unitPrice",
          align: "right",
          render: (price: number) => <MoneyText value={price} currency={detail.currency} />,
        },
        {
          title: "SL tối thiểu",
          dataIndex: "minQty",
          align: "right",
          render: (qty: number) => formatNumber(qty),
        },
        ...(detail.previousVersionId
          ? [
              {
                title: "So với bản trước",
                key: "delta",
                render: (_: unknown, line: PriceLine) => {
                  const change = changes.get(line.serviceCode);
                  if (!change) return null;
                  if (change.change === "ADDED") return <Tag color="green">Mới</Tag>;
                  if (change.change !== "CHANGED")
                    return <Typography.Text type="secondary">—</Typography.Text>;
                  const pct = Number(change.deltaPct ?? 0);
                  return (
                    <Typography.Text type={pct < 0 ? "success" : "danger"}>
                      {pct < 0 ? "▼" : "▲"} {Math.abs(pct)}%
                    </Typography.Text>
                  );
                },
              },
            ]
          : []),
        { title: "Ghi chú", dataIndex: "note", responsive: ["lg"] },
      ]}
    />
  );
}

function LinesEditPanel({ detail, onDone }: { detail: PriceListDetail; onDone(): void }) {
  const { message } = App.useApp();
  const services = useServices({ active: true });
  const replace = useReplaceLines(detail.id);
  const showConflict = useConflictModal();
  const previous = usePriceList(detail.previousVersionId ?? undefined);
  const [lines, setLines] = useState<EditableLine[]>(() =>
    detail.lines.length > 0
      ? detail.lines.map((line) => ({
          ...newLine(line.serviceCode),
          unitPrice: Number(line.unitPrice),
          minQty: Number(line.minQty),
          note: line.note,
        }))
      : [newLine()],
  );
  const [errorCodes, setErrorCodes] = useState<string[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<unknown>(null);

  const save = () => {
    const issues = lineProblems(lines);
    setProblems(issues);
    setError(null);
    if (issues.length > 0) return;
    replace.mutate(
      { version: detail.version, lines: toLineInputs(lines, services.data) },
      {
        onSuccess: () => {
          message.success("Price line saved");
          onDone();
        },
        onError: (saveError) => {
          if (isConflict(saveError)) {
            showConflict(saveError, onDone);
            return;
          }
          const code = errorCodeOf(saveError);
          if (code && LINE_ERROR_CODES.has(code)) {
            setErrorCodes(
              lineErrorCodes(
                saveError,
                lines.map((line) => line.serviceCode),
              ),
            );
          }
          setError(saveError);
        },
      },
    );
  };

  return (
    <div>
      {error !== null && <ProblemAlert error={error} style={{ marginBottom: 12 }} />}
      {problems.length > 0 && (
        <Alert type="error" showIcon title={problems.join(" ")} style={{ marginBottom: 12 }} />
      )}
      <PriceLinesEditor
        value={lines}
        onChange={setLines}
        scope={detail.scope}
        serviceType={detail.serviceType}
        currency={detail.currency}
        errorCodes={errorCodes}
        previous={
          previous.data
            ? new Map(previous.data.lines.map((line) => [line.serviceCode, Number(line.unitPrice)]))
            : undefined
        }
      />
      <Flex justify="flex-end" gap={8} style={{ marginTop: 12 }}>
        <Button onClick={onDone}>Hủy</Button>
        <Button type="primary" loading={replace.isPending} onClick={save}>
          Lưu dòng giá
        </Button>
      </Flex>
    </div>
  );
}

export function PriceListDetailPage() {
  const { id = "" } = useParams();
  const { me, hasPermission } = useSession();
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = usePriceList(id);
  const versions = usePriceListVersions(id);
  const groups = useServiceGroups();
  const submit = useSubmitPriceList();
  const revise = useRevisePriceList();
  const cancel = useCancelPriceList();
  const lastRejection = useLastRejection(id);
  const instances = useWorkflowInstancesOfDocument("PRICE_LIST", id);
  const previous = usePriceList(
    query.data?.status === "DRAFT" ? (query.data.previousVersionId ?? undefined) : undefined,
  );
  const [headerOpen, setHeaderOpen] = useState(false);
  const [newVersionOpen, setNewVersionOpen] = useState(params.get("newVersion") === "1");
  const [editingLines, setEditingLines] = useState(params.get("editLines") === "1");
  const [tab, setTab] = useState("lines");
  const [compare, setCompare] = useState<{ left?: string; right?: string }>({});
  const [selected, setSelected] = useState<string[]>([]);
  const submitError = (location.state as { submitError?: string } | null)?.submitError;

  if (query.isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (query.isError || !query.data) {
    return statusOf(query.error) === 404 ? (
      <Result
        status="404"
        title="Không tìm thấy bảng giá"
        subTitle="Không tìm thấy hoặc bạn không có quyền xem."
        extra={<Link to="/pricing">Về danh sách bảng giá</Link>}
      />
    ) : (
      <ProblemAlert error={query.error} />
    );
  }

  const detail = query.data;
  const actions = priceListActions(detail, me, hasPermission);
  const groupName =
    detail.serviceType === "*"
      ? "Mọi nhóm"
      : (groups.data?.find((group) => group.code === detail.serviceType)?.name ??
        detail.serviceType);
  const latest = (versions.data ?? [])[0];

  const clearParam = (key: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(key);
        return next;
      },
      { replace: true },
    );

  const doSubmit = () => {
    submit.resetKey();
    submit.mutate(id, {
      onSuccess: () =>
        message.success(
          detail.revisionNumber > 0
            ? "Price list resubmitted"
            : "Price list submitted for approval",
        ),
      onError: (error) => {
        if (errorCodeOf(error) === "PRC_EMPTY_LINES") setTab("lines");
        message.error(errorMessage(error));
      },
    });
  };

  const doRevise = () => {
    revise.resetKey();
    revise.mutate(id, {
      onSuccess: () => {
        message.success("Price list returned to Draft – edit and resubmit.");
        setEditingLines(true);
      },
      onError: (error) => message.error(errorMessage(error)),
    });
  };

  const doCancel = () => {
    cancel.resetKey();
    modal.confirm({
      title: `Hủy ${detail.code}?`,
      content: "A draft that was never submitted will be moved to Cancelled.",
      okText: "Hủy bảng giá",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      onOk: () =>
        cancel
          .mutateAsync(id)
          .then(() => message.success("Price list cancelled"))
          .catch((error: unknown) => message.error(errorMessage(error))),
    });
  };

  const primary: React.ReactNode[] = [];
  if (actions.has("SUBMIT")) {
    primary.push(
      <Button key="submit" type="primary" loading={submit.isPending} onClick={doSubmit}>
        {detail.revisionNumber > 0 ? "Gửi lại" : "Gửi duyệt"}
      </Button>,
    );
  }
  if (actions.has("REVISE")) {
    primary.push(
      <Button key="revise" type="primary" loading={revise.isPending} onClick={doRevise}>
        Sửa lại
      </Button>,
    );
  }
  if (actions.has("UPDATE")) {
    primary.push(
      <Button key="header" icon={<EditOutlined />} onClick={() => setHeaderOpen(true)}>
        Sửa thông tin
      </Button>,
    );
  }
  if (actions.has("NEW_VERSION") && detail.status === "EFFECTIVE") {
    primary.push(
      <Button key="version" type="primary" onClick={() => setNewVersionOpen(true)}>
        Tạo version mới
      </Button>,
    );
  }
  const ended =
    detail.status === "SUPERSEDED" || detail.status === "EXPIRED" || detail.status === "CANCELLED";
  const menu = [
    ...(actions.has("NEW_VERSION") && detail.status !== "EFFECTIVE"
      ? [{ key: "version", label: "Tạo version mới", onClick: () => setNewVersionOpen(true) }]
      : []),
    ...(detail.scope === "CONTRACT" && detail.scopeId
      ? [
          {
            key: "resolve",
            label: "Xem trước đơn giá",
            onClick: () => navigate(`/pricing/resolve?contractId=${detail.scopeId}`),
          },
        ]
      : []),
    ...(latest && latest.id !== detail.id && ended
      ? [
          {
            key: "latest",
            label: `Mở version mới nhất (v${latest.listVersion})`,
            onClick: () => navigate(`/pricing/${latest.id}`),
          },
        ]
      : []),
    ...(actions.has("CANCEL")
      ? [{ key: "cancel", label: "Hủy bảng giá", danger: true, onClick: doCancel }]
      : []),
  ];

  const decrease = maxDecreasePct(detail.lines, previous.data?.lines);
  const expectedSteps = expectedApprovalSteps(detail.scope, decrease);
  const historyEntries = fromInstanceHistory(
    (instances.data ?? []).flatMap((instance) => instance.history),
  );

  return (
    <>
      <DocumentHeader
        backTo={{ path: "/pricing", label: "Bảng giá" }}
        title={`${detail.code} · v${detail.listVersion}`}
        tags={
          <>
            {detail.revisionNumber > 0 && (
              <Tooltip title="v = price version; rev = number of revisions before approval">
                <Typography.Text type="secondary">rev {detail.revisionNumber}</Typography.Text>
              </Tooltip>
            )}
            <StatusTag kind="PRICE_LIST" status={detail.status} />
            {detail.usedInBilling && (
              <Tooltip title="Used to generate a billing sheet – cannot be edited or cancelled (PRC-05)">
                <Tag icon={<LockOutlined />} color="orange">
                  Đã dùng tính tiền
                  {detail.billedThrough ? ` đến ${formatDate(detail.billedThrough)}` : ""}
                </Tag>
              </Tooltip>
            )}
          </>
        }
        subtitle={
          <Space size={6} wrap>
            <span>{detail.name}</span>·<ScopeTag scope={detail.scope} />
            {detail.scope !== "GLOBAL" && detail.scope !== "SERVICE_GROUP" && (
              <ScopeTargetLabel
                scope={detail.scope}
                scopeId={detail.scopeId}
                serviceType={detail.serviceType}
              />
            )}
            · {groupName} · <DateRangeText from={detail.validFrom} to={detail.validTo} />
          </Space>
        }
        actions={
          <>
            {primary}
            {menu.length > 0 && (
              <Dropdown menu={{ items: menu }} trigger={["click"]}>
                <Button icon={<MoreOutlined />}>Thêm</Button>
              </Dropdown>
            )}
          </>
        }
      />

      {detail.sourceAddendumId && (
        <Alert
          type="info"
          icon={<PaperClipOutlined />}
          showIcon
          style={{ marginBottom: 12 }}
          title={
            <>
              Tạo từ <Link to={`/addenda/${detail.sourceAddendumId}`}>phụ lục đổi giá</Link> (duyệt
              theo phụ lục, không qua quy trình bảng giá).
            </>
          }
        />
      )}
      {submitError && (
        <Alert
          type="error"
          showIcon
          closable
          style={{ marginBottom: 12 }}
          title="Đã lưu nháp nhưng gửi duyệt không thành công"
          description={submitError}
          onClose={() => navigate(location.pathname, { replace: true, state: null })}
        />
      )}
      {detail.status === "DRAFT" && detail.revisionNumber > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={`Bảng giá được trả về để sửa (lần ${detail.revisionNumber})`}
          description={
            lastRejection
              ? `“${lastRejection.comment ?? ""}” – ${lastRejection.user.fullName ?? ""}, ${formatDate(lastRejection.at)}`
              : undefined
          }
        />
      )}
      {actions.has("SUBMIT") && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={`Khi gửi, bảng giá dự kiến qua: ${expectedSteps.join(" → ")}`}
          description={
            decrease > 10
              ? `Decrease of up to ${decrease}% vs v${previous.data?.listVersion} (> 10%), so Board of Directors approval is also required.`
              : undefined
          }
        />
      )}
      {detail.status === "APPROVED" && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 12 }}
          title={`Approved; effective from ${formatDate(detail.validFrom)}.`}
        />
      )}
      {detail.status === "REJECTED" && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          title={`Bị từ chối${lastRejection?.comment ? `: “${lastRejection.comment}”` : ""}`}
          description="Click “Sửa lại” to edit and resubmit (the price list is an internal document, not a new record – PRC-06)."
        />
      )}
      {detail.status === "EFFECTIVE" && detail.supersededById && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={
            <>
              Sẽ được thay bằng <Link to={`/pricing/${detail.supersededById}`}>version mới</Link>
              {detail.validTo
                ? ` từ ${formatDate(dayjs(detail.validTo).add(1, "day").format("YYYY-MM-DD"))}`
                : ""}
              .
            </>
          }
        />
      )}

      <DocumentLayout
        main={
          <Card size="small">
            <Tabs
              activeKey={tab}
              onChange={setTab}
              items={[
                {
                  key: "lines",
                  label: "Dòng giá",
                  children: editingLines ? (
                    <LinesEditPanel
                      detail={detail}
                      onDone={() => {
                        setEditingLines(false);
                        clearParam("editLines");
                      }}
                    />
                  ) : (
                    <>
                      {actions.has("UPDATE") && (
                        <Flex justify="flex-end" style={{ marginBottom: 8 }}>
                          <Button icon={<EditOutlined />} onClick={() => setEditingLines(true)}>
                            Sửa dòng giá
                          </Button>
                        </Flex>
                      )}
                      <LinesTable detail={detail} />
                    </>
                  ),
                },
                {
                  key: "versions",
                  label: `Phiên bản${versions.data ? ` (${versions.data.length})` : ""}`,
                  children: (
                    <>
                      <VersionTimeline
                        versions={versions.data ?? []}
                        currentId={detail.id}
                        selected={selected}
                        onSelect={setSelected}
                      />
                      {selected.length === 2 && (
                        <Button
                          type="primary"
                          onClick={() => {
                            setCompare({ left: selected[0], right: selected[1] });
                            setTab("compare");
                          }}
                        >
                          So sánh 2 version đã chọn
                        </Button>
                      )}
                    </>
                  ),
                },
                {
                  key: "compare",
                  label: "So sánh",
                  children: (
                    <CompareTable
                      versions={versions.data ?? []}
                      left={compare.left ?? detail.previousVersionId ?? undefined}
                      right={compare.right ?? detail.id}
                      onChange={(left, right) => setCompare({ left, right })}
                      currency={detail.currency}
                    />
                  ),
                },
                {
                  key: "history",
                  label: "Lịch sử",
                  children: <HistoryTimeline entries={historyEntries} />,
                },
              ]}
            />
          </Card>
        }
        side={
          detail.sourceAddendumId && !detail.workflow ? (
            <Card size="small" title="Tiến độ duyệt">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Approved via addendum – does not go through the price list workflow."
              />
            </Card>
          ) : (
            <WorkflowProgressCard
              documentType="PRICE_LIST"
              documentId={detail.id}
              invalidate={[pricingKeys.detail(detail.id)]}
            />
          )
        }
      />

      {headerOpen && <HeaderDrawer priceList={detail} onClose={() => setHeaderOpen(false)} />}
      {newVersionOpen && (
        <NewVersionModal
          base={detail}
          onClose={() => {
            setNewVersionOpen(false);
            clearParam("newVersion");
          }}
        />
      )}
    </>
  );
}

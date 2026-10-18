import { useEffect } from "react";
import { Button, Card, Checkbox, Flex, Grid, Segmented, Tabs, Tooltip } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import { useSession } from "@/features/auth";
import { useInbox, useInboxCounters, type InboxTab } from "@/features/workflow";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { PageHeader } from "@/shared/components/page/PageHeader";
import { useListQuery } from "@/shared/hooks/useListQuery";

import { DemoSubmitButton } from "../components/DemoSubmitButton";
import { DocumentTypeFilter } from "../components/DocumentTypeFilter";
import { InboxCardList } from "../components/InboxCardList";
import { InboxStats } from "../components/InboxStats";
import { InboxTable } from "../components/InboxTable";
import { saveQueue } from "../lib/nextItem";

const TABS: { key: InboxTab; label: string }[] = [
  { key: "ASSIGNED", label: "Chờ tôi duyệt" },
  { key: "SUBMITTED", label: "Tôi đã gửi" },
  { key: "WATCHING", label: "Theo dõi" },
];

type Filters = { tab?: string; docType?: string; overdue?: string };

function greeting(hour: number): string {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function isTab(value: string | undefined): value is InboxTab {
  return value === "ASSIGNED" || value === "SUBMITTED" || value === "WATCHING";
}

export function InboxPage() {
  const { me, hasPermission } = useSession();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const canApprove = hasPermission("Workflow.Act");
  const list = useListQuery<Filters>(["tab", "docType", "overdue"]);
  const tab: InboxTab = isTab(list.filters.tab)
    ? list.filters.tab
    : canApprove
      ? "ASSIGNED"
      : "SUBMITTED";
  const overdue = list.filters.overdue === "true";

  const counters = useInboxCounters();
  const inbox = useInbox({
    tab,
    docType: list.filters.docType,
    overdue: overdue || undefined,
    page: list.page - 1,
    size: list.size,
  });
  const items = inbox.data?.items ?? [];
  const total = inbox.data?.total ?? 0;

  useEffect(() => {
    if (tab === "ASSIGNED" && inbox.data) {
      saveQueue(
        inbox.data.items.map((item) => ({
          documentType: item.documentType,
          documentId: item.documentId,
        })),
      );
    }
  }, [tab, inbox.data]);

  const setTab = (next: InboxTab) => list.setFilters({ tab: next, overdue: undefined });
  const filtered = !!list.filters.docType || overdue;

  const empty = filtered ? (
    <EmptyState
      filtered
      onClearFilters={() => list.setFilters({ docType: undefined, overdue: undefined })}
    />
  ) : tab === "ASSIGNED" ? (
    <EmptyState
      description={
        canApprove
          ? "Không có hồ sơ nào đang chờ bạn 🎉"
          : "Tài khoản của bạn không tham gia duyệt hồ sơ (không có quyền duyệt)."
      }
    />
  ) : tab === "SUBMITTED" ? (
    <EmptyState
      description="Bạn chưa gửi hồ sơ nào."
      action={
        hasPermission("Contract.Create") ? (
          <Link to="/contracts/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Tạo hợp đồng
            </Button>
          </Link>
        ) : undefined
      }
    />
  ) : (
    <EmptyState description="Bạn chưa xử lý hồ sơ nào." />
  );

  const tabLabel = (key: InboxTab, label: string) =>
    key === "ASSIGNED" && counters.data ? `${label} (${counters.data.total})` : label;

  const toolbar = (
    <Flex gap={12} wrap align="center" justify="space-between" style={{ marginBottom: 12 }}>
      <Flex gap={12} wrap align="center">
        <DocumentTypeFilter
          counters={counters.data}
          value={list.filters.docType}
          showCounts={tab === "ASSIGNED"}
          size={isMobile ? "small" : "middle"}
          onChange={(docType) => list.setFilters({ docType })}
        />
        {tab === "ASSIGNED" && (
          <Checkbox
            checked={overdue}
            onChange={(event) =>
              list.setFilters({ overdue: event.target.checked ? "true" : undefined })
            }
          >
            Chỉ quá hạn
          </Checkbox>
        )}
      </Flex>
      <Tooltip title="Làm mới">
        <Button
          type="text"
          aria-label="Làm mới"
          icon={<ReloadOutlined spin={inbox.isFetching} />}
          onClick={() => {
            void inbox.refetch();
            void counters.refetch();
          }}
        />
      </Tooltip>
    </Flex>
  );

  const content = inbox.isError ? (
    <ProblemAlert error={inbox.error} />
  ) : isMobile ? (
    <InboxCardList
      tab={tab}
      items={items}
      total={total}
      loading={inbox.isFetching}
      empty={empty}
      onLoadMore={
        list.size < 100 ? () => list.setPage(1, Math.min(100, list.size + 20)) : undefined
      }
    />
  ) : (
    <InboxTable
      tab={tab}
      items={items}
      total={total}
      page={list.page}
      size={list.size}
      loading={inbox.isFetching}
      meId={me.id}
      empty={empty}
      onPage={list.setPage}
    />
  );

  return (
    <>
      <PageHeader
        title={`${greeting(new Date().getHours())}, ${me.fullName}`}
        subtitle={me.department ? `${me.department.name} · Việc cần bạn xử lý hôm nay` : undefined}
        extra={<DemoSubmitButton onSubmitted={() => setTab("SUBMITTED")} />}
      />
      {!isMobile && (
        <InboxStats
          counters={counters.data}
          loading={counters.isLoading}
          actingFor={me.actingFor}
          onSelect={(filter) =>
            list.setFilters({
              tab: filter.tab,
              overdue: filter.overdue ? "true" : undefined,
              docType: filter.docType,
            })
          }
        />
      )}
      <Card>
        {isMobile ? (
          <Segmented
            block
            style={{ marginBottom: 12 }}
            aria-label="Nhóm hồ sơ"
            value={tab}
            options={TABS.map((item) => ({
              value: item.key,
              label: tabLabel(item.key, item.label),
            }))}
            onChange={(value) => setTab(value as InboxTab)}
          />
        ) : (
          <Tabs
            activeKey={tab}
            onChange={(key) => setTab(key as InboxTab)}
            items={TABS.map((item) => ({ key: item.key, label: tabLabel(item.key, item.label) }))}
          />
        )}
        {toolbar}
        {content}
      </Card>
    </>
  );
}

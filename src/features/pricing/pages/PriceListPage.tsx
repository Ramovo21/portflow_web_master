import {
  Button,
  DatePicker,
  Flex,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { CloseOutlined, LockOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";

import { Can } from "@/features/auth";
import { useServiceGroups } from "@/features/catalog/hooks/useCatalog";
import { DateRangeText } from "@/shared/components/data/DateText";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { FilterBar } from "@/shared/components/page/FilterBar";
import { PageHeader } from "@/shared/components/page/PageHeader";
import { StatusTag } from "@/shared/components/status/StatusTag";
import { useListQuery } from "@/shared/hooks/useListQuery";
import { todayIso } from "@/shared/lib/format";
import { statusOptions } from "@/shared/lib/statusLabels";

import type { PriceListRow, PriceScope } from "../api/priceLists";
import { ScopeTag, ScopeTargetLabel } from "../components/ScopeTag";
import { SCOPE_META, SCOPE_PRIORITY, latestPerChain } from "../domain";
import { usePriceLists, usePriceListVersions } from "../hooks/usePricing";

type Filters = {
  scope?: string;
  scopeId?: string;
  serviceType?: string;
  status?: string;
  validAt?: string;
  mode?: string;
};

const FILTER_KEYS: (keyof Filters & string)[] = [
  "scope",
  "scopeId",
  "serviceType",
  "status",
  "validAt",
  "mode",
];

function OlderVersions({ row }: { row: PriceListRow }) {
  const versions = usePriceListVersions(row.id);
  const older = (versions.data ?? []).filter((version) => version.id !== row.id);
  if (versions.isLoading)
    return <Typography.Text type="secondary">Đang tải version…</Typography.Text>;
  if (older.length === 0)
    return <Typography.Text type="secondary">Không có version khác.</Typography.Text>;
  return (
    <Flex vertical gap={4} style={{ paddingInlineStart: 24 }}>
      {older.map((version) => (
        <Space key={version.id} size={8} wrap>
          <span>└</span>
          <Link to={`/pricing/${version.id}`}>
            {version.code} · v{version.listVersion}
          </Link>
          <DateRangeText from={version.validFrom} to={version.validTo} />
          <StatusTag kind="PRICE_LIST" status={version.status} />
        </Space>
      ))}
    </Flex>
  );
}

export function PriceListPage() {
  const navigate = useNavigate();
  const list = useListQuery<Filters>(FILTER_KEYS);
  const { filters } = list;
  const latestOnly = filters.mode !== "all";
  const groups = useServiceGroups();
  const query = usePriceLists({
    scope: filters.scope,
    scopeId: filters.scopeId,
    serviceType: filters.serviceType,
    status: filters.status,
    validAt: filters.validAt,
    page: list.page - 1,
    size: list.size,
  });
  const groupName = new Map((groups.data ?? []).map((group) => [group.code, group.name]));
  const rows = latestOnly ? latestPerChain(query.data?.items ?? []) : (query.data?.items ?? []);

  return (
    <>
      <PageHeader
        title="Bảng giá"
        subtitle="Bảng giá theo phạm vi, có phiên bản, không chồng thời gian hiệu lực."
        extra={
          <>
            <Link to="/pricing/resolve">
              <Button icon={<SearchOutlined />}>Xem trước đơn giá</Button>
            </Link>
            <Can permission="PriceList.Create">
              <Link to="/pricing/new">
                <Button type="primary" icon={<PlusOutlined />}>
                  Tạo bảng giá
                </Button>
              </Link>
            </Can>
          </>
        }
      />
      <FilterBar total={query.data?.total} hasFilters={list.hasFilters} onClear={list.clearFilters}>
        <Select
          allowClear
          placeholder="Phạm vi"
          style={{ width: 160 }}
          value={filters.scope}
          onChange={(scope) => list.setFilters({ scope, scopeId: undefined })}
          options={SCOPE_PRIORITY.map((scope) => ({
            value: scope,
            label: SCOPE_META[scope].label,
          }))}
          aria-label="Phạm vi"
        />
        {filters.scopeId && filters.scope && (
          <Tag
            closable
            closeIcon={<CloseOutlined />}
            onClose={() => list.setFilters({ scopeId: undefined })}
          >
            {SCOPE_META[filters.scope as PriceScope]?.label}:{" "}
            <ScopeTargetLabel scope={filters.scope as PriceScope} scopeId={filters.scopeId} />
          </Tag>
        )}
        <Select
          allowClear
          placeholder="Nhóm dịch vụ"
          style={{ width: 180 }}
          value={filters.serviceType}
          onChange={(serviceType) => list.setFilters({ serviceType })}
          options={[
            ...(groups.data ?? []).map((group) => ({ value: group.code, label: group.name })),
            { value: "*", label: "Toàn hệ thống (*)" },
          ]}
          aria-label="Nhóm dịch vụ"
        />
        <Select
          allowClear
          placeholder="Status"
          style={{ width: 200 }}
          value={filters.status}
          onChange={(status) => list.setFilters({ status })}
          options={statusOptions("PRICE_LIST")}
          aria-label="Status"
        />
        <DatePicker
          placeholder="Hiệu lực tại"
          format="DD/MM/YYYY"
          value={filters.validAt ? dayjs(filters.validAt) : null}
          onChange={(date) =>
            list.setFilters({ validAt: date ? date.format("YYYY-MM-DD") : undefined })
          }
          presets={[{ label: "Hôm nay", value: dayjs(todayIso()) }]}
        />
        <Radio.Group
          size="small"
          optionType="button"
          value={latestOnly ? "latest" : "all"}
          onChange={(event) =>
            list.setFilters({ mode: event.target.value === "all" ? "all" : undefined })
          }
          options={[
            { value: "latest", label: "Chỉ bản mới nhất" },
            { value: "all", label: "Tất cả version" },
          ]}
        />
      </FilterBar>
      {query.isError && <ProblemAlert error={query.error} style={{ marginBottom: 16 }} />}
      <Table<PriceListRow>
        rowKey="id"
        loading={query.isLoading}
        dataSource={rows}
        scroll={{ x: 900 }}
        onRow={(row) => ({
          onClick: () => navigate(`/pricing/${row.id}`),
          className: "pf-clickable-row",
        })}
        expandable={
          latestOnly
            ? {
                expandedRowRender: (row) => <OlderVersions row={row} />,
                rowExpandable: (row) => row.listVersion > 1,
              }
            : undefined
        }
        pagination={{
          current: list.page,
          pageSize: list.size,
          total: query.data?.total ?? 0,
          showSizeChanger: true,
          onChange: list.setPage,
        }}
        locale={{
          emptyText: (
            <EmptyState
              filtered={list.hasFilters}
              onClearFilters={list.clearFilters}
              description={
                list.hasFilters
                  ? undefined
                  : "No price lists yet. The standard price list (system-wide) applies by default."
              }
            />
          ),
        }}
        columns={[
          {
            title: "Mã / Tên",
            key: "code",
            render: (_, row) => (
              <div>
                <Space size={6}>
                  <Typography.Text strong>
                    {row.code} · v{row.listVersion}
                  </Typography.Text>
                  {row.revisionNumber > 0 && (
                    <Typography.Text type="secondary">rev {row.revisionNumber}</Typography.Text>
                  )}
                  {row.usedInBilling && (
                    <Tooltip title="Used for billing – cannot be edited">
                      <LockOutlined aria-label="Used for billing" />
                    </Tooltip>
                  )}
                </Space>
                <div>
                  <Typography.Text type="secondary">{row.name}</Typography.Text>
                </div>
              </div>
            ),
          },
          {
            title: "Phạm vi / Đối tượng",
            key: "scope",
            render: (_, row) => (
              <div>
                <ScopeTag scope={row.scope} />
                {row.scope !== "GLOBAL" && row.scope !== "SERVICE_GROUP" && (
                  <div>
                    <Typography.Text type="secondary">
                      <ScopeTargetLabel scope={row.scope} scopeId={row.scopeId} />
                    </Typography.Text>
                  </div>
                )}
              </div>
            ),
          },
          {
            title: "Nhóm",
            dataIndex: "serviceType",
            render: (code: string) => (code === "*" ? "Mọi nhóm" : (groupName.get(code) ?? code)),
          },
          {
            title: "Hiệu lực",
            key: "validity",
            render: (_, row) => <DateRangeText from={row.validFrom} to={row.validTo} />,
          },
          {
            title: "Status",
            dataIndex: "status",
            render: (status: string) => <StatusTag kind="PRICE_LIST" status={status} />,
          },
        ]}
      />
    </>
  );
}

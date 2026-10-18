import { useEffect, useState } from "react";
import { Badge, Button, Card, Input, Segmented, Select, Table, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";

import { Can } from "@/features/auth";
import { DateRangeText } from "@/shared/components/data/DateText";
import { MoneyText } from "@/shared/components/data/MoneyText";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { FilterBar } from "@/shared/components/page/FilterBar";
import { PageHeader } from "@/shared/components/page/PageHeader";
import { SigningTag, StatusTag } from "@/shared/components/status/StatusTag";
import { useListQuery } from "@/shared/hooks/useListQuery";
import { daysFromToday } from "@/shared/lib/format";

import type { ContractListItem } from "../api/contracts";
import { useContractList, useCustomerOptions, useRevisionCount } from "../hooks/useContracts";
import { groupParams, STATUS_GROUPS } from "../lib/listFilters";

type Filters = { group?: string; q?: string; customerId?: string };

function StepLine({ item }: { item: ContractListItem }) {
  const workflow = item.workflow;
  if (!workflow) return null;
  if (workflow.workflowStatus === "RUNNING" && workflow.order) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        ↳ Bước {workflow.order}/{workflow.totalSteps} · {workflow.name} ·{" "}
        {workflow.assignees.map((person) => person.fullName).join(", ")}
      </Typography.Text>
    );
  }
  if (workflow.workflowStatus === "REVISION_REQUESTED") {
    return (
      <Typography.Text type="warning" style={{ fontSize: 12 }}>
        ↳ Chờ người gửi sửa
      </Typography.Text>
    );
  }
  return null;
}

function ExpiryHint({ item }: { item: ContractListItem }) {
  if (item.contract.status !== "ACTIVE") return null;
  const days = daysFromToday(item.contract.effectiveTo);
  if (days > 30) return null;
  return (
    <Typography.Text
      type={days <= 7 ? "danger" : "warning"}
      style={{ fontSize: 12, display: "block" }}
    >
      ⚠ còn {days} ngày
    </Typography.Text>
  );
}

export function ContractListPage() {
  const navigate = useNavigate();
  const list = useListQuery<Filters>(["group", "q", "customerId"]);
  const [search, setSearch] = useState(list.filters.q ?? "");
  const [customerQuery, setCustomerQuery] = useState("");
  const customers = useCustomerOptions(customerQuery);
  const revisionCount = useRevisionCount();

  useEffect(() => {
    const timer = setTimeout(() => {
      if ((list.filters.q ?? "") !== search) list.setFilters({ q: search || undefined });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const query = useContractList({
    ...groupParams(list.filters.group),
    q: list.filters.q,
    customerId: list.filters.customerId,
    page: list.page - 1,
    size: list.size,
  });

  return (
    <>
      <PageHeader
        title="Hợp đồng"
        subtitle="Hợp đồng và phụ lục theo trạng thái duyệt."
        extra={
          <Can permission="Contract.Create">
            <Link to="/contracts/new">
              <Button type="primary" icon={<PlusOutlined />}>
                Tạo hợp đồng
              </Button>
            </Link>
          </Can>
        }
      />
      <FilterBar
        total={query.data?.total}
        hasFilters={list.hasFilters}
        onClear={() => {
          setSearch("");
          list.clearFilters();
        }}
      >
        <Segmented
          aria-label="Lọc theo trạng thái"
          value={list.filters.group ?? "all"}
          onChange={(value) =>
            list.setFilters({ group: value === "all" ? undefined : String(value) })
          }
          options={STATUS_GROUPS.map((group) => ({
            value: group.value,
            label:
              group.value === "revision" && (revisionCount.data ?? 0) > 0 ? (
                <span>
                  {group.label} <Badge count={revisionCount.data} size="small" color="orange" />
                </span>
              ) : (
                group.label
              ),
          }))}
          style={{ maxWidth: "100%", overflowX: "auto" }}
        />
        <Input.Search
          aria-label="Tìm hợp đồng"
          placeholder="Số HĐ, tiêu đề…"
          allowClear
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ width: 240 }}
        />
        <Select
          aria-label="Khách hàng"
          placeholder="Khách hàng"
          allowClear
          showSearch
          filterOption={false}
          onSearch={setCustomerQuery}
          value={list.filters.customerId}
          onChange={(value) => list.setFilters({ customerId: value })}
          style={{ width: 240 }}
          options={(customers.data ?? []).map((customer) => ({
            value: customer.id,
            label: `${customer.name}${customer.status === "SUSPENDED" ? " (tạm ngưng)" : ""}`,
          }))}
        />
      </FilterBar>
      {query.isError && <ProblemAlert error={query.error} style={{ marginBottom: 16 }} />}
      <Card size="small">
        <Table<ContractListItem>
          rowKey={(item) => item.contract.id}
          loading={query.isFetching}
          dataSource={query.data?.items ?? []}
          rowClassName="pf-clickable-row"
          onRow={(item) => ({ onClick: () => navigate(`/contracts/${item.contract.id}`) })}
          locale={{
            emptyText: (
              <EmptyState
                filtered={list.hasFilters}
                onClearFilters={list.clearFilters}
                action={
                  <Can permission="Contract.Create">
                    <Link to="/contracts/new">
                      <Button type="primary">Tạo hợp đồng đầu tiên</Button>
                    </Link>
                  </Can>
                }
              />
            ),
          }}
          pagination={{
            current: list.page,
            pageSize: list.size,
            total: query.data?.total ?? 0,
            showSizeChanger: true,
            onChange: list.setPage,
          }}
          columns={[
            {
              title: "Số HĐ",
              key: "number",
              render: (_, item) => <Typography.Text strong>{item.contract.number}</Typography.Text>,
            },
            {
              title: "Tiêu đề / Khách hàng",
              key: "title",
              render: (_, item) => (
                <div>
                  <div>{item.contract.title}</div>
                  <Typography.Text type="secondary">{item.customerName ?? "—"}</Typography.Text>
                  <div>
                    <StepLine item={item} />
                  </div>
                </div>
              ),
            },
            {
              title: "Hiệu lực",
              key: "period",
              responsive: ["md"],
              render: (_, item) => (
                <>
                  <DateRangeText
                    from={item.contract.effectiveFrom}
                    to={item.contract.effectiveTo}
                  />
                  <ExpiryHint item={item} />
                </>
              ),
            },
            {
              title: "Giá trị",
              key: "value",
              align: "right",
              responsive: ["lg"],
              render: (_, item) => (
                <MoneyText value={item.contract.value} currency={item.contract.currency} short />
              ),
            },
            {
              title: "Status",
              key: "status",
              render: (_, item) => (
                <>
                  <StatusTag
                    kind="CONTRACT"
                    status={
                      item.contract.status === "SUBMITTED" ? "UNDER_REVIEW" : item.contract.status
                    }
                  />
                  <SigningTag state={item.contract.signingState} />
                  {item.revision > 1 && <Tag>rev {item.revision}</Tag>}
                </>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}

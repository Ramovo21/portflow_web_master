import { useEffect, useState } from "react";
import { Button, Card, Flex, Grid, Input, List, Result, Segmented, Table, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { Can, useSession } from "@/features/auth";
import { DateText } from "@/shared/components/data/DateText";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { FilterBar } from "@/shared/components/page/FilterBar";
import { PageHeader } from "@/shared/components/page/PageHeader";
import { StatusTag } from "@/shared/components/status/StatusTag";
import { useListQuery } from "@/shared/hooks/useListQuery";
import { errorMessage } from "@/shared/lib/problem";

import type { CustomerListItem } from "../api/customers";
import { CustomerFormDrawer } from "../components/CustomerFormDrawer";
import { useCustomers } from "../hooks/useCustomers";

type Filters = { q?: string; status?: string };

const STATUS_OPTIONS = [
  { label: "Tất cả", value: "" },
  { label: "Hoạt động", value: "ACTIVE" },
  { label: "Tạm ngưng", value: "SUSPENDED" },
];

export function CustomerListPage() {
  const { me } = useSession();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const list = useListQuery<Filters>(["q", "status"]);
  const [search, setSearch] = useState(list.filters.q ?? "");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if ((list.filters.q ?? "") === search) return;
    const timer = setTimeout(() => list.setFilters({ q: search || undefined }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const query = useCustomers({
    q: list.filters.q,
    status: list.filters.status,
    page: list.page - 1,
    size: list.size,
  });

  const scopeLabel =
    me.dataScope === "ALL"
      ? "Phạm vi: Toàn công ty"
      : `Phạm vi: ${me.department?.name ?? "Phòng của bạn"}`;
  const looksLikeTaxCode = /\d{10}/.test((list.filters.q ?? "").replace(/[\s.]/g, ""));
  const clear = () => {
    setSearch("");
    list.clearFilters();
  };

  const createButton = (
    <Can permission="Customer.Create">
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
        Thêm khách hàng
      </Button>
    </Can>
  );

  const empty = (
    <EmptyState
      filtered={list.hasFilters}
      onClearFilters={clear}
      description={
        list.hasFilters
          ? `Không tìm thấy khách hàng phù hợp.${looksLikeTaxCode ? " Khách hàng có thể thuộc phòng khác." : ""}`
          : "No customers yet."
      }
      action={createButton}
    />
  );

  const open = (item: CustomerListItem) => navigate(`/customers/${item.id}`);

  return (
    <>
      <PageHeader title="Khách hàng" subtitle={scopeLabel} extra={createButton} />
      <FilterBar total={query.data?.total} hasFilters={list.hasFilters} onClear={clear}>
        <Input.Search
          allowClear
          placeholder="Tên, mã KH hoặc MST…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ width: 300, maxWidth: "100%" }}
          aria-label="Tìm khách hàng"
        />
        <Segmented
          options={STATUS_OPTIONS}
          value={list.filters.status ?? ""}
          onChange={(value) => list.setFilters({ status: (value as string) || undefined })}
        />
      </FilterBar>

      {query.isError ? (
        <Card>
          <Result
            status="error"
            title="Could not load the customer list"
            subTitle={errorMessage(query.error)}
            extra={<Button onClick={() => void query.refetch()}>Thử lại</Button>}
          />
        </Card>
      ) : screens.md === false ? (
        <List
          loading={query.isLoading}
          dataSource={query.data?.items ?? []}
          locale={{ emptyText: empty }}
          pagination={
            query.data && query.data.total > list.size
              ? {
                  current: list.page,
                  pageSize: list.size,
                  total: query.data.total,
                  onChange: list.setPage,
                  size: "small",
                }
              : false
          }
          renderItem={(item) => (
            <Card
              size="small"
              style={{ marginBottom: 8 }}
              onClick={() => open(item)}
              className="pf-clickable-row"
            >
              <Flex justify="space-between" gap={8}>
                <Typography.Text strong>{item.name}</Typography.Text>
                <StatusTag kind="CUSTOMER" status={item.status} />
              </Flex>
              <Typography.Text type="secondary">
                {item.code} · MST {item.taxCode}
              </Typography.Text>
            </Card>
          )}
        />
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table<CustomerListItem>
            rowKey="id"
            loading={query.isLoading}
            dataSource={query.data?.items ?? []}
            locale={{ emptyText: empty }}
            rowClassName="pf-clickable-row"
            onRow={(item) => ({ onClick: () => open(item) })}
            pagination={{
              current: list.page,
              pageSize: list.size,
              total: query.data?.total ?? 0,
              showSizeChanger: true,
              onChange: list.setPage,
              hideOnSinglePage: true,
            }}
            columns={[
              {
                title: "Mã KH",
                dataIndex: "code",
                width: 120,
                render: (code: string) => <Typography.Text code>{code}</Typography.Text>,
              },
              {
                title: "Tên khách hàng",
                key: "name",
                render: (_, item) => (
                  <>
                    <Typography.Text strong>{item.name}</Typography.Text>
                    {item.address && (
                      <div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {item.address}
                        </Typography.Text>
                      </div>
                    )}
                  </>
                ),
              },
              {
                title: "MST",
                dataIndex: "taxCode",
                width: 170,
                render: (taxCode: string) => (
                  <span onClick={(event) => event.stopPropagation()}>
                    <Typography.Text
                      copyable={{ text: taxCode, tooltips: ["Sao chép", "Đã chép"] }}
                    >
                      {taxCode}
                    </Typography.Text>
                  </span>
                ),
              },
              {
                title: "Status",
                dataIndex: "status",
                width: 130,
                render: (status: string) => <StatusTag kind="CUSTOMER" status={status} />,
              },
              ...(screens.xl
                ? [
                    {
                      title: "Ngày tạo",
                      dataIndex: "createdAt",
                      width: 120,
                      render: (createdAt: string) => <DateText value={createdAt} />,
                    },
                  ]
                : []),
            ]}
          />
        </Card>
      )}

      <CustomerFormDrawer open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

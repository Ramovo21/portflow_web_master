import { useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Dropdown,
  Empty,
  List,
  Result,
  Skeleton,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { EditOutlined, FileAddOutlined, MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { Link, useNavigate, useParams } from "react-router-dom";

import { usePermission, useSession } from "@/features/auth";
import { DateRangeText, DateTimeText } from "@/shared/components/data/DateText";
import { MoneyText } from "@/shared/components/data/MoneyText";
import { DocumentHeader } from "@/shared/components/document/DocumentHeader";
import { StatusTag } from "@/shared/components/status/StatusTag";
import { errorCodeOf, errorMessage, statusOf } from "@/shared/lib/problem";

import type { Customer, CustomerContractRow, CustomerPriceListRow } from "../api/customers";
import { CustomerFormDrawer } from "../components/CustomerFormDrawer";
import { CustomerOverviewTab } from "../components/CustomerOverviewTab";
import { CustomerStatusBanner } from "../components/CustomerStatusBanner";
import { CustomerStatusModal } from "../components/CustomerStatusModal";
import { useCustomer, useCustomerContracts, useCustomerPriceLists } from "../hooks/useCustomers";
import { customerActions } from "../permissions";

function ContractsTab({ customer }: { customer: Customer }) {
  const navigate = useNavigate();
  const query = useCustomerContracts(customer.id, true);
  if (query.isError)
    return <Typography.Text type="danger">{errorMessage(query.error)}</Typography.Text>;
  return (
    <>
      <Table<CustomerContractRow>
        rowKey={(row) => row.contract.id}
        size="small"
        loading={query.isLoading}
        dataSource={query.data?.items ?? []}
        pagination={false}
        rowClassName="pf-clickable-row"
        onRow={(row) => ({ onClick: () => navigate(`/contracts/${row.contract.id}`) })}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No contracts yet." />,
        }}
        columns={[
          {
            title: "Số HĐ",
            key: "number",
            render: (_, row) => <Typography.Text strong>{row.contract.number}</Typography.Text>,
          },
          {
            title: "Hiệu lực",
            key: "range",
            render: (_, row) => (
              <DateRangeText from={row.contract.effectiveFrom} to={row.contract.effectiveTo} />
            ),
          },
          {
            title: "Giá trị",
            key: "value",
            align: "right",
            render: (_, row) => (
              <MoneyText short value={row.contract.value} currency={row.contract.currency} />
            ),
          },
          {
            title: "Status",
            key: "status",
            render: (_, row) => (
              <>
                <StatusTag kind="CONTRACT" status={row.contract.status} />
                {row.workflow?.name && (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Bước {row.workflow.order} · {row.workflow.name}
                    </Typography.Text>
                  </div>
                )}
              </>
            ),
          },
        ]}
      />
      {(query.data?.total ?? 0) > (query.data?.items.length ?? 0) && (
        <div style={{ marginTop: 8 }}>
          <Link to={`/contracts?customerId=${customer.id}`}>
            Xem tất cả {query.data!.total} hợp đồng
          </Link>
        </div>
      )}
    </>
  );
}

function PriceListsTab({ customer }: { customer: Customer }) {
  const navigate = useNavigate();
  const query = useCustomerPriceLists(customer.id, true);
  const canCreate = usePermission("PriceList.Create");
  if (query.isError)
    return <Typography.Text type="danger">{errorMessage(query.error)}</Typography.Text>;
  return (
    <>
      {canCreate && customer.status === "ACTIVE" && (
        <div style={{ marginBottom: 12 }}>
          <Link to={`/pricing/new?scope=CUSTOMER&scopeId=${customer.id}`}>
            <Button size="small" icon={<PlusOutlined />}>
              Tạo bảng giá riêng
            </Button>
          </Link>
        </div>
      )}
      <Table<CustomerPriceListRow>
        rowKey="id"
        size="small"
        loading={query.isLoading}
        dataSource={query.data?.items ?? []}
        pagination={false}
        rowClassName="pf-clickable-row"
        onRow={(row) => ({ onClick: () => navigate(`/pricing/${row.id}`) })}
        locale={{
          emptyText: (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No custom price lists yet." />
          ),
        }}
        columns={[
          {
            title: "Mã BG",
            dataIndex: "code",
            render: (code: string) => <Typography.Text strong>{code}</Typography.Text>,
          },
          { title: "Nhóm dịch vụ", dataIndex: "serviceType" },
          { title: "Version", dataIndex: "listVersion", render: (v: number) => `v${v}` },
          {
            title: "Hiệu lực",
            key: "range",
            render: (_, row) => <DateRangeText from={row.validFrom} to={row.validTo} />,
          },
          {
            title: "Status",
            dataIndex: "status",
            render: (s: string) => <StatusTag kind="PRICE_LIST" status={s} />,
          },
        ]}
      />
    </>
  );
}

function ContactsTab({ customer }: { customer: Customer }) {
  if (customer.contacts.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No contacts yet." />;
  }
  return (
    <List
      dataSource={customer.contacts}
      renderItem={(contact) => (
        <List.Item>
          <List.Item.Meta
            title={
              <>
                {contact.name} {contact.primary && <Tag color="blue">Chính</Tag>}
              </>
            }
            description={
              <>
                {contact.role && <span>{contact.role} · </span>}
                {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
                {contact.email && contact.phone && " · "}
                {contact.phone && (
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a>
                )}
              </>
            }
          />
        </List.Item>
      )}
    />
  );
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useSession();
  const navigate = useNavigate();
  const query = useCustomer(id);
  const [editing, setEditing] = useState(false);
  const [statusAction, setStatusAction] = useState<"suspend" | "reactivate" | null>(null);
  const contractsCount = useCustomerContracts(id, hasPermission("Contract.Read"));

  if (query.isLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }
  if (query.isError || !query.data) {
    const notFound = statusOf(query.error) === 404 || errorCodeOf(query.error) === "CUS_NOT_FOUND";
    return (
      <Card>
        <Result
          status={notFound ? "404" : "error"}
          title={
            notFound
              ? "Không tìm thấy khách hàng hoặc bạn không có quyền xem"
              : "Could not load the customer"
          }
          subTitle={notFound ? undefined : errorMessage(query.error)}
          extra={
            <Button type="primary" onClick={() => navigate("/customers")}>
              Về danh sách khách hàng
            </Button>
          }
        />
      </Card>
    );
  }

  const customer = query.data;
  const actions = customerActions(customer, hasPermission);
  const canCreateContract = hasPermission("Contract.Create");
  const primary = customer.contacts.find((contact) => contact.primary);

  const menuItems = [
    ...(actions.suspend ? [{ key: "suspend", label: "Tạm ngưng…", danger: true }] : []),
    ...(actions.reactivate ? [{ key: "reactivate", label: "Kích hoạt lại…" }] : []),
  ];

  const tabs = [
    {
      key: "overview",
      label: "Tổng quan",
      children: <CustomerOverviewTab customerId={customer.id} />,
    },
    {
      key: "info",
      label: "Thông tin",
      children: (
        <Descriptions column={{ xs: 1, md: 2 }} size="small">
          <Descriptions.Item label="Tên" span="filled">
            {customer.name}
          </Descriptions.Item>
          <Descriptions.Item label="Mã KH">{customer.code}</Descriptions.Item>
          <Descriptions.Item label="MST">
            <Typography.Text copyable>{customer.taxCode}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Địa chỉ" span="filled">
            {customer.address ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Người đại diện" span="filled">
            {customer.representative?.fullName
              ? `${customer.representative.fullName}${customer.representative.position ? ` – ${customer.representative.position}` : ""}`
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Liên hệ chính" span="filled">
            {primary
              ? [primary.name, primary.role, primary.email, primary.phone]
                  .filter(Boolean)
                  .join(" · ")
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Tạo lúc">
            <DateTimeText value={customer.createdAt} />
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật">
            <DateTimeText value={customer.updatedAt} />
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    ...(hasPermission("Contract.Read")
      ? [
          {
            key: "contracts",
            label: `Hợp đồng${contractsCount.data ? ` (${contractsCount.data.total})` : ""}`,
            children: <ContractsTab customer={customer} />,
          },
        ]
      : []),
    ...(hasPermission("PriceList.Read")
      ? [{ key: "price-lists", label: "Bảng giá", children: <PriceListsTab customer={customer} /> }]
      : []),
    {
      key: "contacts",
      label: `Liên hệ (${customer.contacts.length})`,
      children: <ContactsTab customer={customer} />,
    },
  ];

  return (
    <>
      <DocumentHeader
        backTo={{ path: "/customers", label: "Khách hàng" }}
        title={customer.name}
        tags={<StatusTag kind="CUSTOMER" status={customer.status} />}
        subtitle={`${customer.code} · MST ${customer.taxCode}`}
        actions={
          <>
            {canCreateContract && (
              <Tooltip
                title={
                  customer.status === "SUSPENDED"
                    ? "Khách hàng đang tạm ngưng – không tạo hợp đồng mới (FR-C03)"
                    : undefined
                }
              >
                <Button
                  icon={<FileAddOutlined />}
                  disabled={customer.status !== "ACTIVE"}
                  onClick={() => navigate(`/contracts/new?customerId=${customer.id}`)}
                >
                  Tạo hợp đồng
                </Button>
              </Tooltip>
            )}
            {actions.update && (
              <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
                Sửa
              </Button>
            )}
            {menuItems.length > 0 && (
              <Dropdown
                menu={{
                  items: menuItems,
                  onClick: ({ key }) => setStatusAction(key as "suspend" | "reactivate"),
                }}
              >
                <Button icon={<MoreOutlined />} aria-label="Thêm thao tác" />
              </Dropdown>
            )}
          </>
        }
      />
      <CustomerStatusBanner
        customer={customer}
        onReactivate={actions.reactivate ? () => setStatusAction("reactivate") : undefined}
      />
      <Card>
        <Tabs items={tabs} />
      </Card>

      <CustomerFormDrawer open={editing} customer={customer} onClose={() => setEditing(false)} />
      <CustomerStatusModal
        customer={customer}
        action={statusAction}
        onClose={() => setStatusAction(null)}
      />
    </>
  );
}

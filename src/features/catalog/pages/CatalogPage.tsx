import { useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Dropdown,
  Flex,
  Input,
  Menu,
  Row,
  Segmented,
  Table,
  Tag,
  Typography,
} from "antd";
import { CheckOutlined, MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";

import { Can, usePermission } from "@/features/auth";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { PageHeader } from "@/shared/components/page/PageHeader";
import { errorMessage } from "@/shared/lib/problem";

import { uomLabel, type ServiceItem } from "../api/catalog";
import { GroupModal } from "../components/GroupModal";
import { ServiceDrawer } from "../components/ServiceDrawer";
import { useBreakpoint } from "../components/useBreakpoint";
import { useDeactivateService, useServiceGroups, useServices } from "../hooks/useCatalog";

export function CatalogPage() {
  const { modal, message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const group = params.get("group") ?? undefined;
  const showInactive = params.get("inactive") === "1";
  const [keyword, setKeyword] = useState(params.get("q") ?? "");
  const canManage = usePermission("ServiceCatalog.Manage");
  const isMobile = useBreakpoint();

  const groups = useServiceGroups();
  const services = useServices();
  const deactivate = useDeactivateService();
  const [drawer, setDrawer] = useState<{ service: ServiceItem | null } | null>(null);
  const [groupModal, setGroupModal] = useState(false);

  const setParam = (key: string, value: string | undefined) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const all = useMemo(() => services.data ?? [], [services.data]);
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const item of all)
      if (showInactive || item.active)
        result.set(item.groupCode, (result.get(item.groupCode) ?? 0) + 1);
    return result;
  }, [all, showInactive]);
  const q = keyword.trim().toLowerCase();
  const rows = all.filter(
    (item) =>
      (showInactive || item.active) &&
      (!group || item.groupCode === group) &&
      (!q || item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)),
  );
  const groupName = new Map((groups.data ?? []).map((g) => [g.code, g.name]));
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);

  const confirmDeactivate = (item: ServiceItem) => {
    deactivate.resetKey();
    modal.confirm({
      title: `Suspend ${item.code}?`,
      content:
        "Không thêm được vào bảng giá / hợp đồng mới. Bảng giá và hợp đồng đang có vẫn giữ nguyên. Hiện chưa kích hoạt lại được.",
      okText: "Ngưng dịch vụ",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: () =>
        deactivate
          .mutateAsync(item.id)
          .then(() => message.success(`Suspended ${item.code}`))
          .catch((error: unknown) => message.error(errorMessage(error))),
    });
  };

  const groupItems = [
    { key: "", label: `Tất cả · ${total}` },
    ...(groups.data ?? []).map((g) => ({
      key: g.code,
      label: `${g.name} · ${counts.get(g.code) ?? 0}`,
      title: g.code,
    })),
  ];

  return (
    <>
      <PageHeader
        title="Danh mục dịch vụ"
        subtitle="Mã dịch vụ và đơn vị tính dùng chung cho bảng giá, sản lượng, thanh toán."
        extra={
          <Can permission="ServiceCatalog.Manage">
            <Button icon={<PlusOutlined />} onClick={() => setGroupModal(true)}>
              Nhóm
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setDrawer({ service: null })}
            >
              Dịch vụ
            </Button>
          </Can>
        }
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={6}>
          {isMobile ? (
            <div style={{ overflowX: "auto" }}>
              <Segmented
                value={group ?? ""}
                onChange={(value) => setParam("group", String(value) || undefined)}
                options={groupItems.map((item) => ({ value: item.key, label: item.label }))}
              />
            </div>
          ) : (
            <Card size="small" styles={{ body: { padding: 4 } }}>
              <Menu
                mode="inline"
                selectedKeys={[group ?? ""]}
                items={groupItems}
                onClick={({ key }) => setParam("group", key || undefined)}
                style={{ borderInlineEnd: 0 }}
              />
            </Card>
          )}
        </Col>
        <Col xs={24} lg={18}>
          <Card size="small">
            <Flex gap={8} wrap align="center" style={{ marginBottom: 12 }}>
              <Input.Search
                allowClear
                placeholder="Tìm mã, tên dịch vụ…"
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setParam("q", event.target.value || undefined);
                }}
                style={{ maxWidth: 320 }}
              />
              <Checkbox
                checked={showInactive}
                onChange={(event) => setParam("inactive", event.target.checked ? "1" : undefined)}
              >
                Hiện cả dịch vụ đã ngưng
              </Checkbox>
            </Flex>
            <Table<ServiceItem>
              rowKey="id"
              size="middle"
              loading={services.isLoading}
              dataSource={rows}
              pagination={false}
              scroll={{ x: 720 }}
              locale={{
                emptyText: (
                  <EmptyState
                    filtered={!!(q || group)}
                    onClearFilters={() => {
                      setKeyword("");
                      setParams(new URLSearchParams(), { replace: true });
                    }}
                  />
                ),
              }}
              onRow={(item) => ({ style: item.active ? undefined : { opacity: 0.55 } })}
              columns={[
                {
                  title: "Mã",
                  dataIndex: "code",
                  render: (code: string) => <Typography.Text code>{code}</Typography.Text>,
                },
                { title: "Tên", dataIndex: "name" },
                {
                  title: "Nhóm",
                  dataIndex: "groupCode",
                  responsive: ["md"],
                  render: (code: string) => groupName.get(code) ?? code,
                },
                {
                  title: "ĐVT",
                  dataIndex: "uom",
                  render: (uom: string) => <span title={uom}>{uomLabel(uom)}</span>,
                },
                {
                  title: "Thuế",
                  dataIndex: "defaultTaxRate",
                  align: "right",
                  render: (rate: number) => `${Math.round(rate * 10_000) / 100}%`,
                },
                {
                  title: "Bắt buộc",
                  dataIndex: "mandatoryDefault",
                  align: "center",
                  render: (value: boolean) =>
                    value ? <CheckOutlined aria-label="Bắt buộc" /> : null,
                },
                {
                  title: "Status",
                  dataIndex: "active",
                  render: (active: boolean) =>
                    active ? <Tag color="success">Hoạt động</Tag> : <Tag>Đã ngưng</Tag>,
                },
                ...(canManage
                  ? [
                      {
                        key: "actions",
                        width: 48,
                        render: (_: unknown, item: ServiceItem) => (
                          <Dropdown
                            trigger={["click"]}
                            menu={{
                              items: [
                                {
                                  key: "edit",
                                  label: "Sửa",
                                  onClick: () => setDrawer({ service: item }),
                                },
                                ...(item.active
                                  ? [
                                      {
                                        key: "deactivate",
                                        label: "Ngưng dịch vụ",
                                        danger: true,
                                        onClick: () => confirmDeactivate(item),
                                      },
                                    ]
                                  : []),
                              ],
                            }}
                          >
                            <Button
                              type="text"
                              icon={<MoreOutlined />}
                              aria-label={`Thao tác ${item.code}`}
                            />
                          </Dropdown>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </Col>
      </Row>
      {drawer && (
        <ServiceDrawer
          service={drawer.service}
          defaultGroupCode={group}
          onClose={() => setDrawer(null)}
        />
      )}
      {groupModal && <GroupModal onClose={() => setGroupModal(false)} />}
    </>
  );
}

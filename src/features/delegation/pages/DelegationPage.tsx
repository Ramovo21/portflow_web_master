import { useMemo, useState } from "react";
import { App, Button, Card, Flex, Segmented, Table, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { usePermission, useSession } from "@/features/auth";
import { DateRangeText } from "@/shared/components/data/DateText";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { PageHeader } from "@/shared/components/page/PageHeader";
import { errorMessage } from "@/shared/lib/problem";
import { documentTypeLabel } from "@/shared/lib/statusLabels";

import { DELEGATION_STATE_LABELS, delegationState, type Delegation } from "../api/delegations";
import { DelegationModal } from "../components/DelegationModal";
import { useDelegations, useRevokeDelegation } from "../hooks/useDelegations";

type View = "current" | "all";

export function DelegationPage() {
  const { modal, message } = App.useApp();
  const { me } = useSession();
  const isAdmin = usePermission("User.Admin");
  const delegations = useDelegations();
  const revoke = useRevokeDelegation();
  const [view, setView] = useState<View>("current");
  const [creating, setCreating] = useState(false);

  const rows = useMemo(
    () =>
      (delegations.data ?? []).filter((delegation) => {
        const state = delegationState(delegation);
        return view === "all" || state === "ACTIVE" || state === "UPCOMING";
      }),
    [delegations.data, view],
  );

  const person = (id: string, name: string | null) =>
    id === me.id ? (
      <Typography.Text strong>Tôi</Typography.Text>
    ) : (
      (name ?? <Typography.Text type="secondary">{id}</Typography.Text>)
    );

  const confirmRevoke = (delegation: Delegation) => {
    revoke.resetKey();
    modal.confirm({
      title: `Thu hồi ủy quyền cho ${delegation.toUserName ?? "người nhận"}?`,
      content:
        "Người nhận sẽ không duyệt thay được nữa. Các phiếu đã duyệt thay trước đó vẫn giữ nguyên trong lịch sử.",
      okText: "Thu hồi",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: () =>
        revoke
          .mutateAsync(delegation.id)
          .then(() => message.success("Đã thu hồi ủy quyền"))
          .catch((error: unknown) => message.error(errorMessage(error))),
    });
  };

  const canRevoke = (delegation: Delegation) => {
    const state = delegationState(delegation);
    return (
      (state === "ACTIVE" || state === "UPCOMING") && (isAdmin || delegation.fromUserId === me.id)
    );
  };

  return (
    <>
      <PageHeader
        title="Ủy quyền"
        subtitle="Ủy quyền duyệt thay trong thời gian vắng mặt. Mỗi người chỉ có một ủy quyền trong cùng khoảng thời gian."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
            Tạo ủy quyền
          </Button>
        }
      />
      <Card size="small">
        <Flex style={{ marginBottom: 12 }}>
          <Segmented<View>
            value={view}
            onChange={setView}
            options={[
              { value: "current", label: "Đang & sắp hiệu lực" },
              { value: "all", label: "Tất cả" },
            ]}
          />
        </Flex>
        {delegations.isError ? (
          <ProblemAlert error={delegations.error} />
        ) : (
          <Table<Delegation>
            rowKey="id"
            size="middle"
            loading={delegations.isLoading}
            dataSource={rows}
            pagination={rows.length > 20 ? { pageSize: 20 } : false}
            scroll={{ x: 760 }}
            locale={{
              emptyText:
                view === "current" ? "Chưa có ủy quyền nào đang hiệu lực" : "Chưa có ủy quyền nào",
            }}
            onRow={(delegation) => {
              const state = delegationState(delegation);
              return {
                style: state === "EXPIRED" || state === "REVOKED" ? { opacity: 0.55 } : undefined,
              };
            }}
            columns={[
              {
                title: "Người ủy quyền",
                key: "from",
                render: (_, delegation) => person(delegation.fromUserId, delegation.fromUserName),
              },
              {
                title: "Người nhận",
                key: "to",
                render: (_, delegation) => person(delegation.toUserId, delegation.toUserName),
              },
              {
                title: "Loại hồ sơ",
                dataIndex: "documentTypes",
                render: (types: string[]) =>
                  types.length === 0 ? (
                    <Typography.Text type="secondary">Mọi loại</Typography.Text>
                  ) : (
                    <Flex gap={4} wrap>
                      {types.map((type) => (
                        <Tag key={type}>{documentTypeLabel(type)}</Tag>
                      ))}
                    </Flex>
                  ),
              },
              {
                title: "Thời gian",
                key: "period",
                render: (_, delegation) => (
                  <DateRangeText from={delegation.validFrom} to={delegation.validTo} />
                ),
              },
              {
                title: "Lý do",
                dataIndex: "reason",
                responsive: ["lg"],
                ellipsis: true,
              },
              {
                title: "Trạng thái",
                key: "state",
                render: (_, delegation) => {
                  const { label, color } = DELEGATION_STATE_LABELS[delegationState(delegation)];
                  return <Tag color={color}>{label}</Tag>;
                },
              },
              {
                key: "actions",
                width: 96,
                render: (_, delegation) =>
                  canRevoke(delegation) ? (
                    <Button
                      size="small"
                      danger
                      aria-label={`Thu hồi ủy quyền ${delegation.toUserName ?? ""}`.trim()}
                      onClick={() => confirmRevoke(delegation)}
                    >
                      Thu hồi
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
      </Card>
      {creating && <DelegationModal onClose={() => setCreating(false)} />}
    </>
  );
}

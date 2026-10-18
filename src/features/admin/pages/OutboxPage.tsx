import { Alert, App, Button, Card, Table, Tag, Tooltip, Typography } from "antd";
import { ReloadOutlined, SendOutlined } from "@ant-design/icons";

import { DateTimeText, RelativeTime } from "@/shared/components/data/DateText";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { PageHeader } from "@/shared/components/page/PageHeader";
import { errorMessage } from "@/shared/lib/problem";

import type { IncompletePublication } from "../api/outbox";
import { useIncompletePublications, useResubmitOutbox } from "../hooks/useIdentityAdmin";
import { listenerLabel, shortTypeName } from "../lib/labels";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PUBLISHED: { label: "Chờ gửi", color: "processing" },
  PROCESSING: { label: "Đang gửi", color: "processing" },
  FAILED: { label: "Gửi lỗi", color: "error" },
  RESUBMITTED: { label: "Đã gửi lại", color: "warning" },
};

/**
 * F00 – Outbox: event đã lưu cùng giao dịch nghiệp vụ nhưng chưa tới được RabbitMQ / listener
 * (vd broker sập). Job tự gửi lại mỗi phút; Quản trị có thể gửi lại ngay.
 */
export function OutboxPage() {
  const { message, notification } = App.useApp();
  const publications = useIncompletePublications();
  const resubmit = useResubmitOutbox();
  const rows = publications.data ?? [];

  const runResubmit = () => {
    resubmit.resetKey();
    resubmit.mutate(undefined, {
      onSuccess: (result) =>
        message.success(
          result.incompleteBefore === 0
            ? "Không có sự kiện nào cần gửi lại"
            : `Đã gửi lại ${result.incompleteBefore} sự kiện chưa hoàn thành`,
        ),
      onError: (error) =>
        notification.error({ title: "Gửi lại thất bại", description: errorMessage(error) }),
    });
  };

  return (
    <>
      <PageHeader
        title="Hàng đợi sự kiện"
        subtitle="Sự kiện nghiệp vụ đã lưu nhưng chưa gửi tới được RabbitMQ hoặc bộ xử lý. Hệ thống tự gửi lại mỗi phút; có thể gửi lại ngay sau khi sự cố được khắc phục."
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={publications.isFetching && !publications.isLoading}
              onClick={() => void publications.refetch()}
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={resubmit.isPending}
              disabled={rows.length === 0}
              onClick={runResubmit}
            >
              Gửi lại tất cả
            </Button>
          </>
        }
      />
      {publications.isSuccess && rows.length === 0 && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          title="Mọi sự kiện đã được gửi"
          description="Không có sự kiện nào đang chờ."
        />
      )}
      <Card size="small">
        {publications.isError ? (
          <ProblemAlert error={publications.error} />
        ) : (
          <Table<IncompletePublication>
            rowKey="id"
            size="middle"
            loading={publications.isLoading}
            dataSource={rows}
            pagination={rows.length > 20 ? { pageSize: 20 } : false}
            scroll={{ x: 760 }}
            locale={{ emptyText: "Không có sự kiện chờ gửi" }}
            columns={[
              {
                title: "Sự kiện",
                dataIndex: "eventType",
                render: (type: string) => (
                  <Tooltip title={type}>
                    <Typography.Text strong>{shortTypeName(type)}</Typography.Text>
                  </Tooltip>
                ),
              },
              {
                title: "Gửi tới",
                dataIndex: "listenerId",
                render: (listener: string) => (
                  <Tooltip title={listener}>
                    <Tag>{listenerLabel(listener)}</Tag>
                  </Tooltip>
                ),
              },
              {
                title: "Phát sinh",
                dataIndex: "publishedAt",
                render: (value: string) => <RelativeTime value={value} />,
              },
              {
                title: "Trạng thái",
                dataIndex: "status",
                render: (status: string | null) => {
                  const info = status ? STATUS_LABELS[status] : undefined;
                  return <Tag color={info?.color}>{info?.label ?? status ?? "—"}</Tag>;
                },
              },
              {
                title: "Số lần gửi lại",
                dataIndex: "completionAttempts",
                responsive: ["md"],
                render: (value: number | null) => value ?? 0,
              },
              {
                title: "Gửi lại lần cuối",
                dataIndex: "lastResubmittedAt",
                responsive: ["lg"],
                render: (value: string | null) => <DateTimeText value={value} />,
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}

import { Button, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import type { InboxItem, InboxTab } from "@/features/workflow";
import { RelativeTime } from "@/shared/components/data/DateText";
import { DocumentLink } from "@/shared/components/document/DocumentLink";
import { StatusTag } from "@/shared/components/status/StatusTag";

import { reviewPath } from "../lib/paths";
import { stepLabel } from "../lib/stepLabel";
import { InboxDocumentCell } from "./InboxDocumentCell";
import { SlaText } from "./SlaText";

interface Props {
  tab: InboxTab;
  items: InboxItem[];
  total: number;
  page: number;
  size: number;
  loading: boolean;
  meId: string;
  empty: React.ReactNode;
  onPage(page: number, size: number): void;
}

export function InboxTable({ tab, items, total, page, size, loading, meId, empty, onPage }: Props) {
  const navigate = useNavigate();
  const assigned = tab === "ASSIGNED";

  const columns: ColumnsType<InboxItem> = [
    assigned
      ? {
          key: "sla",
          title: "Hạn xử lý",
          width: 170,
          render: (_, item) => <SlaText dueAt={item.dueAt} startedAt={item.startedAt} />,
        }
      : {
          key: "status",
          title: "Status",
          width: 170,
          render: (_, item) => <StatusTag kind="WORKFLOW" status={item.status} />,
        },
    { key: "doc", title: "Hồ sơ", render: (_, item) => <InboxDocumentCell item={item} /> },
    {
      key: "step",
      title: assigned ? "Bước" : "Đang chờ",
      width: 200,
      render: (_, item) => <Typography.Text>{stepLabel(item)}</Typography.Text>,
    },
    assigned
      ? {
          key: "submitter",
          title: "Gửi bởi",
          width: 180,
          render: (_, item) => (
            <div>
              <Typography.Text>{item.submitterName ?? "—"}</Typography.Text>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  <RelativeTime value={item.submittedAt} />
                </Typography.Text>
              </div>
            </div>
          ),
        }
      : {
          key: "submittedAt",
          title: "Gửi lúc",
          width: 180,
          render: (_, item) => (
            <div>
              <RelativeTime value={item.submittedAt} />
              {tab === "SUBMITTED" &&
                item.status === "REVISION_REQUESTED" &&
                item.submitterId === meId && (
                  <div onClick={(event) => event.stopPropagation()}>
                    <DocumentLink type={item.documentType} id={item.documentId}>
                      <Button
                        size="small"
                        type="link"
                        icon={<EditOutlined />}
                        style={{ paddingInline: 0 }}
                      >
                        Sửa hồ sơ
                      </Button>
                    </DocumentLink>
                  </div>
                )}
            </div>
          ),
        },
  ];

  return (
    <Table<InboxItem>
      rowKey={(item) => item.instanceId}
      columns={columns}
      dataSource={items}
      loading={loading}
      locale={{ emptyText: empty }}
      rowClassName={(item) =>
        `pf-clickable-row${tab === "SUBMITTED" && item.status === "REVISION_REQUESTED" ? " pf-inbox-row--revision" : ""}`
      }
      onRow={(item) => ({
        onClick: () => navigate(reviewPath(item.documentType, item.documentId)),
        onKeyDown: (event) => {
          if (event.key === "Enter") navigate(reviewPath(item.documentType, item.documentId));
        },
        tabIndex: 0,
        style:
          tab === "SUBMITTED" && item.status === "REVISION_REQUESTED"
            ? { background: "#fff7e6" }
            : undefined,
      })}
      pagination={{
        current: page,
        pageSize: size,
        total,
        showSizeChanger: true,
        hideOnSinglePage: total <= 20,
        onChange: onPage,
      }}
    />
  );
}

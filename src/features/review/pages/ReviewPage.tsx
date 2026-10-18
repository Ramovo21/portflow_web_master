import { useState } from "react";
import { App, Button, Card, Col, Flex, Grid, Result, Row, Skeleton, Space, Typography } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { Link, useNavigate, useParams } from "react-router-dom";

import { nextInQueue, removeFromQueue } from "@/features/inbox/lib/nextItem";
import {
  ApprovalActionModal,
  fromInstanceHistory,
  HistoryTimeline,
  useActingOnBehalfOf,
  useWorkflowInstancesOfDocument,
  WorkflowProgressCard,
  type ApprovalActionType,
} from "@/features/workflow";
import { DocumentHeader } from "@/shared/components/document/DocumentHeader";
import { DocumentLink } from "@/shared/components/document/DocumentLink";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { StatusTag } from "@/shared/components/status/StatusTag";
import { formatMoney } from "@/shared/lib/format";
import { statusOf } from "@/shared/lib/problem";
import { documentTypeLabel } from "@/shared/lib/statusLabels";

import { DocumentSummaryCard } from "../components/DocumentSummaryCard";
import { MobileActionBar } from "../components/MobileActionBar";
import { MyTaskCard } from "../components/MyTaskCard";
import { PreviousSubmissions } from "../components/PreviousSubmissions";
import { StatusCard } from "../components/StatusCard";
import { documentQueryKeys } from "../lib/documentKeys";
import { readOpenNext, writeOpenNext } from "../lib/preferences";

export function ReviewPage() {
  const { documentType = "", documentId = "" } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const query = useWorkflowInstancesOfDocument(documentType, documentId);
  const instance = query.data?.[0];
  const onBehalfOf = useActingOnBehalfOf(instance);
  const [action, setAction] = useState<ApprovalActionType | null>(null);
  const [openNext, setOpenNext] = useState(readOpenNext);

  if (query.isLoading) {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </Col>
      </Row>
    );
  }

  if (query.isError) {
    const status = statusOf(query.error);
    if (status === 403) {
      return (
        <Result
          status="403"
          title="You do not have permission to view this document"
          subTitle="Only workflow participants or users with scope to view this document type can open it."
          extra={
            <Link to="/">
              <Button type="primary">Về Inbox</Button>
            </Link>
          }
        />
      );
    }
    if (status === 404) return <NotFound />;
    return <ProblemAlert error={query.error} />;
  }

  if (!instance) return <NotFound />;

  const previous = query.data!.slice(1);
  const canAct = instance.canAct && instance.status === "RUNNING";
  const doc = instance.document;

  const handleDone = () => {
    const current = { documentType, documentId };
    removeFromQueue(current);
    if (!openNext) return;
    const next = nextInQueue(current);
    if (next) {
      navigate(`/review/${next.documentType}/${next.documentId}`);
    } else {
      message.success("You have cleared all tasks in your Inbox 🎉");
      navigate("/");
    }
  };

  return (
    <>
      <DocumentHeader
        backTo={{ path: "/", label: "Inbox" }}
        title={`${documentTypeLabel(instance.documentType)} ${doc.number ?? ""}`.trim()}
        tags={
          <Space size={4}>
            <StatusTag kind="WORKFLOW" status={instance.status} />
            {instance.round > 1 && (
              <Typography.Text type="secondary">vòng {instance.round}</Typography.Text>
            )}
          </Space>
        }
        subtitle={[
          doc.title,
          doc.customerName,
          doc.amount !== null ? formatMoney(doc.amount, doc.currency) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <DocumentLink type={instance.documentType} id={instance.documentId}>
            <Button icon={<ExportOutlined />}>Mở hồ sơ gốc</Button>
          </DocumentLink>
        }
      />

      <Row gutter={[16, 16]} align="top">
        <Col xs={{ span: 24, order: 2 }} xl={{ span: 16, order: 1 }}>
          <Flex vertical gap={16}>
            {canAct ? (
              <MyTaskCard
                instance={instance}
                onBehalfOf={onBehalfOf}
                openNext={openNext}
                onOpenNextChange={(value) => {
                  setOpenNext(value);
                  writeOpenNext(value);
                }}
                onAction={setAction}
                hideButtons={isMobile}
              />
            ) : (
              <StatusCard instance={instance} />
            )}
            <DocumentSummaryCard instance={instance} />
            <Card size="small" title={`Lịch sử duyệt (${instance.history.length})`}>
              <HistoryTimeline entries={fromInstanceHistory(instance.history)} />
            </Card>
          </Flex>
        </Col>
        <Col xs={{ span: 24, order: 1 }} xl={{ span: 8, order: 2 }}>
          <Flex vertical gap={16} className="pf-doc-side">
            <WorkflowProgressCard
              documentType={instance.documentType}
              documentId={instance.documentId}
              instance={instance}
              showActions={false}
              showReviewLink={false}
            />
            <PreviousSubmissions instances={previous} />
          </Flex>
        </Col>
      </Row>

      {canAct && isMobile && <MobileActionBar onAction={setAction} />}

      {canAct && (
        <ApprovalActionModal
          instance={instance}
          action={action}
          onClose={() => setAction(null)}
          invalidate={documentQueryKeys(documentType, documentId)}
          onDone={handleDone}
        />
      )}
    </>
  );
}

function NotFound() {
  return (
    <Result
      status="404"
      title="Document not found"
      subTitle="The document does not exist or has not been submitted for approval."
      extra={
        <Link to="/">
          <Button type="primary">Về Inbox</Button>
        </Link>
      }
    />
  );
}

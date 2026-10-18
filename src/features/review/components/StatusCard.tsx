import { Alert, Button } from "antd";
import { CopyOutlined, EditOutlined } from "@ant-design/icons";

import { useSession } from "@/features/auth";
import type { HistoryEntry, InstanceView } from "@/features/workflow";
import { DocumentLink } from "@/shared/components/document/DocumentLink";
import { formatDateTime, formatDueIn } from "@/shared/lib/format";

function lastEntry(instance: InstanceView, actions: string[]): HistoryEntry | undefined {
  return [...instance.history]
    .filter((entry) => actions.includes(entry.action))
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

export function StatusCard({ instance }: { instance: InstanceView }) {
  const { me } = useSession();
  const isSubmitter = instance.submitter.id === me.id;
  const current = instance.steps.find((step) => step.state === "CURRENT");

  switch (instance.status) {
    case "RUNNING": {
      if (!current) return null;

      const myVote = current.requiresAll
        ? instance.history.find(
            (entry) =>
              entry.stepOrder === current.order &&
              entry.round === instance.round &&
              entry.action === "APPROVE" &&
              (entry.user.id === me.id || entry.onBehalfOf?.id === me.id),
          )
        : undefined;
      if (myVote) {
        const voted = new Set(
          instance.history
            .filter(
              (entry) =>
                entry.stepOrder === current.order &&
                entry.round === instance.round &&
                entry.action === "APPROVE",
            )
            .map((entry) => entry.onBehalfOf?.id ?? entry.user.id),
        );
        const waiting = current.assignees.filter((person) => !voted.has(person.id)).length;
        return (
          <Alert
            type="success"
            showIcon
            title={`You approved at ${formatDateTime(myVote.at)}, waiting for ${waiting} more.`}
          />
        );
      }

      const myDone = instance.steps.find(
        (step) => step.state === "DONE" && step.assignees.some((person) => person.id === me.id),
      );
      const due = current.dueAt ? formatDueIn(current.dueAt) : null;
      return (
        <>
          {myDone && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              title={`Your assigned step (${myDone.name}) đã được xử lý lúc ${formatDateTime(myDone.completedAt)} bởi ${myDone.actedBy?.fullName ?? "—"}.`}
            />
          )}
          <Alert
            type={due?.overdue ? "warning" : "info"}
            showIcon
            title={`Waiting at step ${current.order}. ${current.name} – ${current.assignees.map((person) => person.fullName).join(", ")}${due ? ` · ${due.text}` : ""}`}
          />
        </>
      );
    }
    case "REVISION_REQUESTED": {
      const entry = lastEntry(instance, ["REQUEST_REVISION", "REJECT"]);
      return (
        <Alert
          type="warning"
          showIcon
          title="Document needs revision"
          description={
            entry?.comment ? `“${entry.comment}” – ${entry.user.fullName ?? "—"}` : undefined
          }
          action={
            isSubmitter ? (
              <DocumentLink type={instance.documentType} id={instance.documentId}>
                <Button size="small" icon={<EditOutlined />}>
                  Sửa hồ sơ
                </Button>
              </DocumentLink>
            ) : undefined
          }
        />
      );
    }
    case "APPROVED":
      return (
        <Alert
          type="success"
          showIcon
          title={`Completed ${formatDateTime(instance.completedAt)}.`}
          description="Electronic signature status (if any) is shown on the original document."
        />
      );
    case "REJECTED": {
      const entry = lastEntry(instance, ["REJECT"]);
      const suggestion =
        instance.documentType === "CONTRACT"
          ? "Muốn làm lại: nhân bản thành hợp đồng mới."
          : instance.documentType === "PRICE_LIST"
            ? "Bảng giá có thể sửa lại và gửi tiếp."
            : undefined;
      return (
        <Alert
          type="error"
          showIcon
          title={`Bị từ chối ở bước ${entry ? `${entry.stepOrder}. ${entry.stepName}` : "—"}`}
          description={
            <>
              {entry?.comment && (
                <div>
                  “{entry.comment}” – {entry.user.fullName ?? "—"}
                </div>
              )}
              {isSubmitter && suggestion && <div>{suggestion}</div>}
            </>
          }
          action={
            isSubmitter && suggestion ? (
              <DocumentLink type={instance.documentType} id={instance.documentId}>
                <Button size="small" icon={<CopyOutlined />}>
                  Mở hồ sơ
                </Button>
              </DocumentLink>
            ) : undefined
          }
        />
      );
    }
    case "CANCELLED":
      return <Alert type="info" showIcon title="Workflow cancelled (document cancelled)." />;
    default:
      return null;
  }
}

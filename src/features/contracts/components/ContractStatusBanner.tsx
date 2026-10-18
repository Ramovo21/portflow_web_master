import type { ReactNode } from "react";
import { Alert, Button } from "antd";
import { Link } from "react-router-dom";

import { daysFromToday, formatDate, formatDateTime } from "@/shared/lib/format";

import type { ContractHistoryItem, ContractResponse } from "../api/contracts";
import {
  EXTENSION_MAX_DAYS_AFTER_EXPIRY,
  EXTENSION_MAX_DAYS_BEFORE_EXPIRY,
} from "../lib/addendumEligibility";

interface Props {
  contract: ContractResponse;
  history: ContractHistoryItem[];
  customerStatus?: "ACTIVE" | "SUSPENDED" | null;
  onEdit?(): void;
  onClone?(): void;
  onExtend?(): void;
}

export function ContractStatusBanner({
  contract,
  history,
  customerStatus,
  onEdit,
  onClone,
  onExtend,
}: Props) {
  const banners: {
    key: string;
    type: "info" | "warning" | "error" | "success";
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
  }[] = [];
  const can = (action: string) => contract.allowedActions.includes(action as never);
  const lastDecision = [...history]
    .reverse()
    .find((item) => item.action === "REQUEST_REVISION" || item.action === "REJECT");
  const daysToEnd = daysFromToday(contract.effectiveTo);

  if (
    customerStatus === "SUSPENDED" &&
    (contract.status === "DRAFT" || contract.status === "REVISION_REQUESTED")
  ) {
    banners.push({
      key: "customer",
      type: "error",
      title: "Customer is suspended – cannot be submitted for approval (FR-C03).",
      action: <Link to={`/customers/${contract.customerId}`}>Xem khách hàng</Link>,
    });
  }

  switch (contract.status) {
    case "REVISION_REQUESTED":
      banners.push({
        key: "revision",
        type: "warning",
        title: lastDecision
          ? `${lastDecision.actorName ?? "Người duyệt"}${lastDecision.stepName ? ` (${lastDecision.stepName})` : ""} yêu cầu sửa lúc ${formatDateTime(lastDecision.at)}`
          : "Hợp đồng được trả về để sửa.",
        description: lastDecision?.comment ? `“${lastDecision.comment}”` : undefined,
        action: can("UPDATE") && onEdit && (
          <Button size="small" type="primary" onClick={onEdit}>
            Sửa & gửi lại
          </Button>
        ),
      });
      break;
    case "REJECTED":
      banners.push({
        key: "rejected",
        type: "error",
        title: lastDecision
          ? `Bị từ chối bởi ${lastDecision.actorName ?? "người duyệt"}${lastDecision.stepName ? ` ở bước ${lastDecision.stepName}` : ""}. Hợp đồng đã kết thúc (CTR-04).`
          : "Hợp đồng bị từ chối và đã kết thúc (CTR-04).",
        description: lastDecision?.comment ? `“${lastDecision.comment}”` : undefined,
        action: can("CLONE") && onClone && (
          <Button size="small" onClick={onClone}>
            Nhân bản thành hợp đồng mới
          </Button>
        ),
      });
      break;
    case "APPROVED":
      if (contract.signingState === "PENDING" || contract.signingState === "IN_PROGRESS") {
        banners.push({
          key: "sign",
          type: "info",
          title: "Approved – awaiting e-signature.",
          description:
            "A contract takes effect once it is signed and the start date is reached (CTR-05).",
        });
      } else if (daysFromToday(contract.effectiveFrom) > 0) {
        banners.push({
          key: "future",
          type: "info",
          title: `Approved – takes effect on ${formatDate(contract.effectiveFrom)} (${daysFromToday(contract.effectiveFrom)} days left).`,
        });
      }
      break;
    case "ACTIVE":
      if (daysToEnd <= EXTENSION_MAX_DAYS_BEFORE_EXPIRY) {
        banners.push({
          key: "expiring",
          type: "warning",
          title: `Expired on ${formatDate(contract.effectiveTo)} (${daysToEnd} days left). It can be extended with an addendum.`,
          action: can("CREATE_ADDENDUM") && onExtend && (
            <Button size="small" onClick={onExtend}>
              Tạo phụ lục gia hạn
            </Button>
          ),
        });
      }
      break;
    case "EXPIRED": {
      const daysAgo = -daysToEnd;
      if (daysAgo <= EXTENSION_MAX_DAYS_AFTER_EXPIRY) {
        banners.push({
          key: "expired",
          type: "warning",
          title: `Expired ${daysAgo} days ago – ${EXTENSION_MAX_DAYS_AFTER_EXPIRY - daysAgo} days left to extend (CTR-X1).`,
          action: can("CREATE_ADDENDUM") && onExtend && (
            <Button size="small" onClick={onExtend}>
              Gia hạn
            </Button>
          ),
        });
      } else {
        banners.push({
          key: "expired",
          type: "info",
          title: `Expired more than ${EXTENSION_MAX_DAYS_AFTER_EXPIRY} days ago – cannot be extended, duplicate it instead.`,
          action: can("CLONE") && onClone && (
            <Button size="small" onClick={onClone}>
              Nhân bản
            </Button>
          ),
        });
      }
      break;
    }
    case "CANCELLED":
      banners.push({
        key: "cancelled",
        type: "info",
        title: `Cancelled: ${contract.cancelReason ?? "—"}`,
      });
      break;
    default:
      break;
  }

  if (banners.length === 0) return null;
  return (
    <>
      {banners.map((banner) => (
        <Alert
          key={banner.key}
          type={banner.type}
          showIcon
          title={banner.title}
          description={banner.description}
          action={banner.action || undefined}
          style={{ marginBottom: 16 }}
          data-testid={`banner-${banner.key}`}
        />
      ))}
    </>
  );
}

import { useEffect } from "react";
import { App } from "antd";

import { usePermission } from "@/features/auth";
import { ReasonModal } from "@/shared/components/feedback/ReasonModal";
import { errorCodeOf, errorMessage } from "@/shared/lib/problem";

import type { Customer } from "../api/customers";
import { useChangeCustomerStatus, useCustomerContracts } from "../hooks/useCustomers";
import { MIN_SUSPEND_REASON } from "../schema";

interface Props {
  customer: Customer;
  action: "suspend" | "reactivate" | null;
  onClose(): void;
}

export function CustomerStatusModal({ customer, action, onClose }: Props) {
  const { message } = App.useApp();
  const mutation = useChangeCustomerStatus();
  const canReadContracts = usePermission("Contract.Read");
  const suspending = action === "suspend";
  const active = useCustomerContracts(customer.id, suspending && canReadContracts, "ACTIVE");
  const drafts = useCustomerContracts(customer.id, suspending && canReadContracts, "DRAFT");

  useEffect(() => {
    if (action) mutation.resetKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const counts =
    canReadContracts && active.data && drafts.data
      ? ` Hiện có ${active.data.total} hợp đồng đang hiệu lực và ${drafts.data.total} hợp đồng nháp.`
      : "";

  return (
    <ReasonModal
      open={action !== null}
      title={suspending ? "Suspend customer" : "Reactivate customer"}
      okText={suspending ? "Tạm ngưng" : "Kích hoạt lại"}
      danger={suspending}
      minLength={suspending ? MIN_SUSPEND_REASON : 1}
      loading={mutation.isPending}
      description={
        suspending ? (
          <>
            <b>
              {customer.name} ({customer.code})
            </b>
            <ul style={{ margin: "4px 0 0", paddingInlineStart: 20 }}>
              <li>Không tạo và không gửi duyệt hợp đồng mới cho khách hàng.</li>
              <li>Hợp đồng đang hiệu lực VẪN chạy, vẫn lập bảng thanh toán.</li>
              <li>Hợp đồng nháp của khách hàng sẽ bị chặn ở bước gửi duyệt.{counts}</li>
            </ul>
          </>
        ) : (
          <>
            <b>
              {customer.name} ({customer.code})
            </b>{" "}
            có thể ký hợp đồng mới trở lại.
          </>
        )
      }
      placeholder={
        suspending
          ? "e.g. Overdue debt for 90 days, pending reconciliation"
          : "e.g. Debt reconciliation completed"
      }
      onCancel={onClose}
      onSubmit={(reason) =>
        mutation.mutate(
          { id: customer.id, action: action!, reason },
          {
            onSuccess: () => {
              message.success(suspending ? "Customer suspended." : "Customer reactivated.");
              onClose();
            },
            onError: (error) => {
              if (errorCodeOf(error) === "CUS_INVALID_STATE") {
                message.warning("The customer status has just changed – data reloaded.");
                onClose();
              } else {
                message.error(errorMessage(error));
              }
            },
          },
        )
      }
    />
  );
}

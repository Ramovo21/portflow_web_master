import { Button, Flex } from "antd";

import type { ApprovalActionType } from "@/features/workflow";

export function MobileActionBar({ onAction }: { onAction(action: ApprovalActionType): void }) {
  return (
    <div className="pf-sticky-footer" role="toolbar" aria-label="Thao tác duyệt">
      <Flex gap={8}>
        <Button danger block onClick={() => onAction("REJECT")}>
          Từ chối
        </Button>
        <Button block onClick={() => onAction("REQUEST_REVISION")}>
          Y/c sửa
        </Button>
        <Button type="primary" block onClick={() => onAction("APPROVE")}>
          Duyệt
        </Button>
      </Flex>
    </div>
  );
}

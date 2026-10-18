import { useCallback } from "react";
import { App } from "antd";

import { errorMessage } from "@/shared/lib/problem";

export function useConflictModal() {
  const { modal } = App.useApp();
  return useCallback(
    (error: unknown, onReload: () => void) => {
      modal.warning({
        title: "Dữ liệu vừa thay đổi",
        content: errorMessage(error),
        okText: "Reload",
        onOk: onReload,
      });
    },
    [modal],
  );
}

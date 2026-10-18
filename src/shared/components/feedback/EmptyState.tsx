import type { ReactNode } from "react";
import { Button, Empty } from "antd";

interface Props {
  filtered?: boolean;
  description?: ReactNode;
  onClearFilters?(): void;
  action?: ReactNode;
}

export function EmptyState({ filtered, description, onClearFilters, action }: Props) {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        description ?? (filtered ? "Không có kết quả phù hợp bộ lọc." : "Chưa có dữ liệu.")
      }
    >
      {filtered && onClearFilters ? <Button onClick={onClearFilters}>Xóa bộ lọc</Button> : action}
    </Empty>
  );
}

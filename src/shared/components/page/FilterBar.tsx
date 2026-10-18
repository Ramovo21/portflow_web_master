import type { ReactNode } from "react";
import { Button, Card, Flex, Typography } from "antd";

interface Props {
  children: ReactNode;
  total?: number;
  hasFilters?: boolean;
  onClear?(): void;
}

export function FilterBar({ children, total, hasFilters, onClear }: Props) {
  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Flex gap={8} wrap align="center" justify="space-between">
        <Flex gap={8} wrap align="center" style={{ flex: 1, minWidth: 0 }}>
          {children}
        </Flex>
        <Flex gap={8} align="center">
          {hasFilters && onClear && (
            <Button type="link" size="small" onClick={onClear}>
              Xóa lọc
            </Button>
          )}
          {total !== undefined && (
            <Typography.Text type="secondary">{total} kết quả</Typography.Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}

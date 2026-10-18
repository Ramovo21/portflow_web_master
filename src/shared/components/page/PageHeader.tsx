import type { ReactNode } from "react";
import { Flex, Typography } from "antd";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;

  extra?: ReactNode;
}

export function PageHeader({ title, subtitle, extra }: Props) {
  return (
    <Flex className="pf-page-header" justify="space-between" align="flex-start" gap={16} wrap>
      <div style={{ minWidth: 0 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {subtitle && (
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 4 }}>
            {subtitle}
          </Typography.Text>
        )}
      </div>
      {extra && (
        <Flex gap={8} wrap>
          {extra}
        </Flex>
      )}
    </Flex>
  );
}

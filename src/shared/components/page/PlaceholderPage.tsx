import type { ReactNode } from "react";
import { Card, Empty, Typography } from "antd";

import { PageHeader } from "./PageHeader";

interface Props {
  title: string;
  subtitle?: string;

  feature?: string;
  extra?: ReactNode;
}

export function PlaceholderPage({ title, subtitle, feature, extra }: Props) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} extra={extra} />
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Typography.Text type="secondary">
              Màn hình đang được phát triển{feature ? ` (${feature})` : ""}.
            </Typography.Text>
          }
        />
      </Card>
    </>
  );
}

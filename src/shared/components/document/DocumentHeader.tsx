import type { ReactNode } from "react";
import { Flex, Space, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

interface Props {
  backTo?: { path: string; label: string };
  title: ReactNode;
  tags?: ReactNode;
  subtitle?: ReactNode;

  actions?: ReactNode;
}

export function DocumentHeader({ backTo, title, tags, subtitle, actions }: Props) {
  return (
    <div className="pf-doc-header">
      {backTo && (
        <Link to={backTo.path} className="pf-doc-header__back">
          <ArrowLeftOutlined /> {backTo.label}
        </Link>
      )}
      <Flex justify="space-between" align="flex-start" gap={16} wrap>
        <div style={{ minWidth: 0 }}>
          <Space size={8} wrap align="center">
            <Typography.Title level={3} style={{ margin: 0 }}>
              {title}
            </Typography.Title>
            {tags}
          </Space>
          {subtitle && (
            <Typography.Paragraph type="secondary" style={{ margin: "4px 0 0" }}>
              {subtitle}
            </Typography.Paragraph>
          )}
        </div>
        {actions && <Space wrap>{actions}</Space>}
      </Flex>
    </div>
  );
}

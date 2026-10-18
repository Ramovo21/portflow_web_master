import { Card, List, Typography } from "antd";
import { CheckCircleFilled, CloseCircleFilled, MinusCircleOutlined } from "@ant-design/icons";

import type { ReadinessItem } from "../lib/readiness";

export function ReadinessChecklist({ items }: { items: ReadinessItem[] }) {
  return (
    <Card size="small" title="Sẵn sàng gửi duyệt">
      <List
        size="small"
        split={false}
        dataSource={items}
        renderItem={(item) => (
          <List.Item
            style={{ paddingInline: 0 }}
            data-testid={`ready-${item.key}`}
            data-ok={String(item.ok)}
          >
            <Typography.Text
              type={item.ok === false ? "danger" : item.ok ? undefined : "secondary"}
            >
              {item.ok === true ? (
                <CheckCircleFilled style={{ color: "#389e0d" }} />
              ) : item.ok === false ? (
                <CloseCircleFilled />
              ) : (
                <MinusCircleOutlined />
              )}{" "}
              {item.label}
            </Typography.Text>
          </List.Item>
        )}
      />
      <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0", fontSize: 12 }}>
        Hệ thống kiểm tra lại các điều kiện này khi gửi duyệt.
      </Typography.Paragraph>
    </Card>
  );
}

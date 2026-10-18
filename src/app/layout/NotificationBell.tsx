import { Badge, Button, Empty, Popover } from "antd";
import { BellOutlined } from "@ant-design/icons";

export function NotificationBell() {
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      title="Thông báo"
      content={
        <div style={{ width: 280 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications yet" />
        </div>
      }
    >
      <Badge count={0} size="small">
        <Button type="text" shape="circle" icon={<BellOutlined />} aria-label="Thông báo" />
      </Badge>
    </Popover>
  );
}

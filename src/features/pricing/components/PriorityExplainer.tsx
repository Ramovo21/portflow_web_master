import { Button, Flex, Popover, Typography } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";

import { SCOPE_PRIORITY } from "../domain";
import { ScopeTag } from "./ScopeTag";

export function PriorityContent() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Flex vertical gap={4}>
        {SCOPE_PRIORITY.map((scope, index) => (
          <div key={scope} style={{ paddingInlineStart: index * 16 }}>
            {index + 1}. <ScopeTag scope={scope} />
          </div>
        ))}
      </Flex>
      <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0" }}>
        Xét <b>theo từng dịch vụ</b>: bảng giá hợp đồng không có dòng cho dịch vụ X thì hệ thống lấy
        giá X ở mức khách hàng, rồi nhóm dịch vụ, rồi toàn hệ thống.
      </Typography.Paragraph>
    </div>
  );
}

export function PriorityExplainer() {
  return (
    <Popover title="Giá được chọn thế nào?" content={<PriorityContent />} trigger="click">
      <Button
        type="link"
        size="small"
        icon={<QuestionCircleOutlined />}
        style={{ paddingInline: 0 }}
      >
        Giá được chọn thế nào?
      </Button>
    </Popover>
  );
}

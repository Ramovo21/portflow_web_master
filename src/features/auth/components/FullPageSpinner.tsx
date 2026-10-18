import { Flex, Spin, Typography } from "antd";

export function FullPageSpinner({ tip }: { tip: string }) {
  return (
    <Flex vertical align="center" justify="center" gap={16} style={{ minHeight: "100vh" }}>
      <Spin size="large" />
      <Typography.Text type="secondary">{tip}</Typography.Text>
    </Flex>
  );
}

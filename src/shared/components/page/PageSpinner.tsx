import { Flex, Spin } from "antd";

export function PageSpinner() {
  return (
    <Flex justify="center" align="center" style={{ minHeight: 240 }}>
      <Spin />
    </Flex>
  );
}

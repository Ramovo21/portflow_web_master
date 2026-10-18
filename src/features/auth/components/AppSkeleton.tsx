import { Flex, Layout, Skeleton } from "antd";

export function AppSkeleton() {
  return (
    <Layout style={{ minHeight: "100vh" }} aria-busy="true" aria-label="Loading session">
      <Layout.Sider width={232} theme="light" breakpoint="lg" collapsedWidth={0}>
        <div style={{ padding: 20 }}>
          <Skeleton active title={{ width: 120 }} paragraph={{ rows: 7, width: "100%" }} />
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ background: "var(--pf-surface)", paddingInline: 24 }}>
          <Flex justify="flex-end" align="center" style={{ height: "100%" }}>
            <Skeleton.Avatar active />
          </Flex>
        </Layout.Header>
        <Layout.Content style={{ margin: 24 }}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

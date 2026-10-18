import { useState } from "react";
import { Alert, Badge, Breadcrumb, Button, Drawer, Grid, Layout, Menu, type MenuProps } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined, SwapOutlined } from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";

import { UserMenu, useSession } from "@/features/auth";
import { useInboxCounters } from "@/features/workflow";
import { BrandLogo } from "@/shared/components/brand/BrandLogo";
import { BackendStatus } from "@/shared/components/layout/BackendStatus";

import { activeNavItem, NAVIGATION, visibleNavigation } from "./navigation";
import { NotificationBell } from "./NotificationBell";

const { Sider, Header, Content } = Layout;

const SIDER_WIDTH = 232;
const SIDER_COLLAPSED_WIDTH = 72;

export function AppLayout() {
  const { me, hasPermission } = useSession();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.lg === false;
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const counters = useInboxCounters();
  const groups = visibleNavigation(NAVIGATION, hasPermission);
  const active = activeNavItem(pathname);
  const menuItems: MenuProps["items"] = groups.map((group) => {
    const items = group.items.map((item) => ({
      key: item.path,
      icon: item.icon,
      label: (
        <Link to={item.path} onClick={() => setDrawerOpen(false)}>
          {item.label}
          {item.badge === "inbox" && (counters.data?.total ?? 0) > 0 && (
            <Badge
              count={counters.data!.total}
              size="small"
              color={counters.data!.overdue > 0 ? "red" : "var(--pf-brand)"}
              style={{ marginInlineStart: 8 }}
              title={`${counters.data!.total} việc chờ duyệt${counters.data!.overdue ? `, ${counters.data!.overdue} quá hạn` : ""}`}
            />
          )}
        </Link>
      ),
    }));
    return group.title
      ? { key: group.key, type: "group" as const, label: group.title, children: items }
      : {
          key: group.key,
          type: "group" as const,
          children: items,
        };
  });

  const menu = (
    <Menu
      mode="inline"
      className="pf-nav"
      selectedKeys={active ? [active.item.path] : []}
      items={menuItems}
    />
  );
  const brand = (compact: boolean) => (
    <Link to="/" className="pf-sider__brand" aria-label="PortFlow – về Inbox">
      <BrandLogo compact={compact} size={30} />
    </Link>
  );

  return (
    <Layout className="pf-shell">
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          size={SIDER_WIDTH + 24}
          styles={{ body: { padding: 0 }, header: { display: "none" } }}
        >
          {brand(false)}
          {menu}
        </Drawer>
      ) : (
        <Sider
          theme="light"
          width={SIDER_WIDTH}
          collapsedWidth={SIDER_COLLAPSED_WIDTH}
          collapsed={collapsed}
          trigger={null}
          className="pf-sider"
        >
          {brand(collapsed)}
          {menu}
        </Sider>
      )}

      <Layout>
        <Header className="pf-header">
          <Button
            type="text"
            aria-label={isMobile || collapsed ? "Mở menu" : "Thu gọn menu"}
            icon={isMobile || collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed((value) => !value))}
          />
          <Breadcrumb
            className="pf-header__breadcrumb"
            items={[
              ...(active?.group?.title ? [{ title: active.group.title }] : []),
              ...(active ? [{ title: active.item.label }] : []),
            ]}
          />
          <div className="pf-header__actions">
            {!isMobile && <BackendStatus />}
            <NotificationBell />
            <UserMenu />
          </div>
        </Header>

        {me.actingFor.length > 0 && (
          <Alert
            banner
            type="info"
            icon={<SwapOutlined />}
            title={
              <>
                Bạn đang được ủy quyền thay mặt{" "}
                <b>{me.actingFor.map((delegation) => delegation.fullName).join(", ")}</b>. Hồ sơ cần
                duyệt thay sẽ xuất hiện trong Inbox.
              </>
            }
          />
        )}

        <Content className="pf-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

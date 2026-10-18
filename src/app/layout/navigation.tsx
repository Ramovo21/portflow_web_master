import type { ReactNode } from "react";
import {
  ApartmentOutlined,
  AuditOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  CloudSyncOutlined,
  DollarOutlined,
  FileTextOutlined,
  InboxOutlined,
  ProfileOutlined,
  SafetyOutlined,
  SwapOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";

export interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;

  anyOf?: string[];

  badge?: "inbox";
}

export interface NavGroup {
  key: string;

  title?: string;
  items: NavItem[];
}

export const NAVIGATION: NavGroup[] = [
  {
    key: "work",
    items: [
      { path: "/", label: "Inbox", icon: <InboxOutlined />, badge: "inbox" },
      {
        path: "/delegations",
        label: "Ủy quyền",
        icon: <SwapOutlined />,
        anyOf: ["Delegation.Manage"],
      },
    ],
  },
  {
    key: "business",
    title: "Nghiệp vụ",
    items: [
      { path: "/customers", label: "Khách hàng", icon: <TeamOutlined />, anyOf: ["Customer.Read"] },
      {
        path: "/contracts",
        label: "Hợp đồng",
        icon: <FileTextOutlined />,
        anyOf: ["Contract.Read"],
      },
      { path: "/pricing", label: "Bảng giá", icon: <DollarOutlined />, anyOf: ["PriceList.Read"] },
      {
        path: "/catalog",
        label: "Danh mục dịch vụ",
        icon: <AppstoreOutlined />,
        anyOf: ["PriceList.Read", "ServiceCatalog.Manage"],
      },
      { path: "/volume", label: "Sản lượng", icon: <BarChartOutlined />, anyOf: ["Volume.Read"] },
      {
        path: "/billing",
        label: "Thanh toán",
        icon: <AuditOutlined />,
        anyOf: ["PaymentSheet.Read"],
      },
    ],
  },
  {
    key: "admin",
    title: "Quản trị",
    items: [
      { path: "/admin/users", label: "Người dùng", icon: <UserOutlined />, anyOf: ["User.Admin"] },
      {
        path: "/admin/departments",
        label: "Phòng ban",
        icon: <ApartmentOutlined />,
        anyOf: ["User.Admin"],
      },
      {
        path: "/admin/roles",
        label: "Vai trò & quyền",
        icon: <SafetyOutlined />,
        anyOf: ["Role.Admin"],
      },
      {
        path: "/admin/document-types",
        label: "Loại hồ sơ",
        icon: <TagsOutlined />,
        anyOf: ["DocumentType.Admin"],
      },
      {
        path: "/admin/workflows",
        label: "Workflow",
        icon: <BranchesOutlined />,
        anyOf: ["Workflow.Admin"],
      },
      {
        path: "/admin/outbox",
        label: "Hàng đợi sự kiện",
        icon: <CloudSyncOutlined />,
        anyOf: ["System.Admin"],
      },
    ],
  },
];

const EXTRA_TITLES: { path: string; label: string; icon: ReactNode }[] = [
  { path: "/account", label: "Thông tin tài khoản", icon: <ProfileOutlined /> },
  { path: "/review", label: "Duyệt hồ sơ", icon: <InboxOutlined /> },
  { path: "/addenda", label: "Phụ lục", icon: <FileTextOutlined /> },
];

export function visibleNavigation(
  groups: NavGroup[],
  hasPermission: (permission: string) => boolean,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.anyOf || item.anyOf.some(hasPermission)),
    }))
    .filter((group) => group.items.length > 0);
}

export function activeNavItem(pathname: string): { group?: NavGroup; item: NavItem } | undefined {
  let best: { group?: NavGroup; item: NavItem } | undefined;
  const candidates = [
    ...NAVIGATION.flatMap((group) => group.items.map((item) => ({ group, item }))),
    ...EXTRA_TITLES.map((item) => ({ group: undefined, item })),
  ];
  for (const candidate of candidates) {
    const { path } = candidate.item;
    const matches =
      path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/");
    if (matches && (!best || path.length > best.item.path.length)) best = candidate;
  }
  return best;
}

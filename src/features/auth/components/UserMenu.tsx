import { Avatar, Dropdown, Flex, Tag, Typography, type MenuProps } from "antd";
import {
  DownOutlined,
  KeyOutlined,
  LogoutOutlined,
  SwapOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import { dataScopeLabel, initials, roleLabel } from "../labels";
import { accountConsoleUrl, logout } from "../oidc";
import { useSession } from "../session";

export function UserMenu() {
  const { me } = useSession();
  const navigate = useNavigate();

  const items: MenuProps["items"] = [
    {
      key: "profile",
      type: "group",
      label: (
        <div className="pf-user-menu__profile">
          <Typography.Text strong>{me.fullName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {me.username}
            {me.department && ` · ${me.department.name}`}
          </Typography.Text>
          <Flex wrap gap={4} style={{ marginTop: 6 }}>
            {me.roles.map((role) => (
              <Tag key={role} color="blue" style={{ marginInlineEnd: 0 }}>
                {roleLabel(role)}
              </Tag>
            ))}
            <Tag style={{ marginInlineEnd: 0 }}>Phạm vi: {dataScopeLabel(me.dataScope)}</Tag>
          </Flex>
        </div>
      ),
    },
    { type: "divider" },
    ...(me.actingFor.length > 0
      ? [
          {
            key: "acting-for",
            type: "group" as const,
            label: (
              <span>
                <SwapOutlined /> Đang thay mặt
              </span>
            ),
            children: me.actingFor.map((delegation) => ({
              key: `acting-${delegation.userId}`,
              disabled: true,
              label: `${delegation.fullName ?? delegation.userId} – đến ${dayjs(delegation.validTo).format("DD/MM")}`,
            })),
          },
          { type: "divider" as const },
        ]
      : []),
    { key: "account", icon: <UserOutlined />, label: "Thông tin tài khoản" },
    { key: "password", icon: <KeyOutlined />, label: "Đổi mật khẩu ↗" },
    { type: "divider" },
    { key: "logout", icon: <LogoutOutlined />, label: "Đăng xuất", danger: true },
  ];

  const onClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "account") navigate("/account");
    else if (key === "password") window.open(accountConsoleUrl, "_blank", "noopener");
    else if (key === "logout") void logout();
  };

  return (
    <Dropdown menu={{ items, onClick }} trigger={["click"]} placement="bottomRight">
      <button type="button" className="pf-user-menu__trigger" aria-label="Menu người dùng">
        <Avatar size={32} className="pf-avatar">
          {initials(me.fullName)}
        </Avatar>
        <span className="pf-user-menu__name">{me.fullName}</span>
        <DownOutlined style={{ fontSize: 10 }} />
      </button>
    </Dropdown>
  );
}

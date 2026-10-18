import { Collapse, List, Tag, Typography } from "antd";

import { roleLabel } from "../labels";

const DEMO_ACCOUNTS = [
  { username: "sales01", fullName: "Nguyễn Văn An", roles: ["SALES"], department: "KD" },
  { username: "salesmgr", fullName: "Trần Thị Bình", roles: ["SALES_MANAGER"], department: "KD" },
  {
    username: "ops01",
    fullName: "Lê Văn Cường",
    roles: ["OPERATIONS", "OPERATIONS_LEAD"],
    department: "KT",
  },
  { username: "acc01", fullName: "Phạm Thị Dung", roles: ["ACCOUNTANT"], department: "KTOAN" },
  {
    username: "chiefacc",
    fullName: "Bùi Văn Khoa",
    roles: ["CHIEF_ACCOUNTANT"],
    department: "KTOAN",
  },
  { username: "legal01", fullName: "Hoàng Văn Em", roles: ["LEGAL"], department: "PC" },
  { username: "director", fullName: "Võ Thị Giang", roles: ["DIRECTOR"], department: "BGD" },
  { username: "director2", fullName: "Đỗ Văn Hải", roles: ["DIRECTOR"], department: "BGD" },
  { username: "admin", fullName: "Quản Trị", roles: ["ADMIN"], department: "IT" },
];

export const DEMO_PASSWORD = "Portflow@123";

export function DemoAccounts({
  onPick,
  disabled,
}: {
  onPick: (username: string) => void;
  disabled?: boolean;
}) {
  return (
    <Collapse
      size="small"
      ghost
      items={[
        {
          key: "demo",
          label: (
            <Typography.Text type="secondary">
              Tài khoản demo <Tag color="orange">chỉ môi trường dev</Tag>
            </Typography.Text>
          ),
          children: (
            <>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                Mật khẩu chung:{" "}
                <Typography.Text code copyable>
                  {DEMO_PASSWORD}
                </Typography.Text>
              </Typography.Paragraph>
              <List
                size="small"
                bordered
                dataSource={DEMO_ACCOUNTS}
                renderItem={(account) => (
                  <List.Item
                    className="pf-demo-account"
                    role="button"
                    tabIndex={0}
                    aria-disabled={disabled}
                    onClick={() => !disabled && onPick(account.username)}
                    onKeyDown={(event) => {
                      if (!disabled && (event.key === "Enter" || event.key === " "))
                        onPick(account.username);
                    }}
                  >
                    <List.Item.Meta
                      title={<Typography.Text strong>{account.username}</Typography.Text>}
                      description={`${account.fullName} · ${account.department}`}
                    />
                    <span>
                      {account.roles.map((role) => (
                        <Tag key={role}>{roleLabel(role)}</Tag>
                      ))}
                    </span>
                  </List.Item>
                )}
              />
            </>
          ),
        },
      ]}
    />
  );
}

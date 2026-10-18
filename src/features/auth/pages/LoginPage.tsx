import { useEffect, useState, type ReactNode } from "react";
import { Alert, Button, Divider, Flex, Typography } from "antd";
import {
  AuditOutlined,
  FileProtectOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import { BrandLogo } from "@/shared/components/brand/BrandLogo";
import { BackendStatus } from "@/shared/components/layout/BackendStatus";

import { DemoAccounts } from "../components/DemoAccounts";
import {
  isIdpUnavailable,
  login,
  restoreSession,
  useRestoreStatus,
  type LoginReason,
} from "../oidc";
import { safeReturnTo } from "../returnTo";

const REASON_ALERTS: Record<
  Exclude<LoginReason, "idp-unavailable">,
  { type: "success" | "warning" | "error"; message: string }
> = {
  "logged-out": { type: "success", message: "You have been signed out." },
  "session-expired": {
    type: "warning",
    message: "Your session has expired. Please sign in again.",
  },
  "callback-error": {
    type: "error",
    message: "Sign-in failed (the link has expired or was already used). Please try again.",
  },
};

const HIGHLIGHTS: { icon: ReactNode; text: string }[] = [
  { icon: <FileProtectOutlined />, text: "Hợp đồng, phụ lục và bảng giá theo một quy trình duyệt" },
  { icon: <AuditOutlined />, text: "Sản lượng, bảng thanh toán và ký số tập trung" },
  { icon: <SafetyCertificateOutlined />, text: "Phân quyền theo vai trò, phòng ban và ủy quyền" },
];

export function LoginPage() {
  const auth = useAuth();
  const restore = useRestoreStatus();
  const [params] = useSearchParams();
  const reason = params.get("reason") as LoginReason | null;
  const returnTo = params.get("returnTo");
  const [redirecting, setRedirecting] = useState(false);
  const [idpError, setIdpError] = useState(false);

  useEffect(() => {
    if (!reason) void restoreSession();
  }, [reason]);

  if (auth.isAuthenticated) return <Navigate to={safeReturnTo(returnTo)} replace />;

  const startLogin = (loginHint?: string) => {
    setRedirecting(true);
    setIdpError(false);
    login({ returnTo, loginHint }).catch(() => {
      setRedirecting(false);
      setIdpError(true);
    });
  };

  const showIdpError =
    idpError ||
    reason === "idp-unavailable" ||
    (!reason && restore === "done" && isIdpUnavailable());
  const reasonAlert = reason && reason !== "idp-unavailable" ? REASON_ALERTS[reason] : undefined;

  return (
    <div className="pf-login">
      <aside className="pf-login__brand">
        <BrandLogo inverted size={40} />
        <div>
          <Typography.Title level={2} className="pf-login__headline">
            Quản lý hợp đồng &amp; thanh toán dịch vụ cảng
          </Typography.Title>
          <ul className="pf-login__highlights">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text}>
                <span className="pf-login__highlight-icon">{item.icon}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <Typography.Text className="pf-login__footnote">© PortFlow</Typography.Text>
      </aside>

      <main className="pf-login__panel">
        <div className="pf-login__card">
          <div className="pf-login__mobile-logo">
            <BrandLogo size={36} />
          </div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Đăng nhập
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            Dùng tài khoản công ty để truy cập PortFlow. Bạn sẽ được chuyển sang trang đăng nhập tập
            trung.
          </Typography.Paragraph>

          <Flex vertical gap={16}>
            {reasonAlert && <Alert showIcon type={reasonAlert.type} title={reasonAlert.message} />}
            {showIdpError && (
              <Alert
                showIcon
                type="error"
                title="Could not reach the sign-in server. Please try again in a few minutes."
                action={
                  <Button size="small" onClick={() => startLogin()}>
                    Thử lại
                  </Button>
                }
              />
            )}

            <Button
              type="primary"
              size="large"
              block
              icon={<LockOutlined />}
              loading={redirecting}
              onClick={() => startLogin()}
            >
              Đăng nhập
            </Button>

            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Quên mật khẩu hoặc bị khóa tài khoản? Liên hệ bộ phận IT để được hỗ trợ.
            </Typography.Text>
          </Flex>

          <Divider style={{ marginBlock: 20 }} />
          <BackendStatus />

          {import.meta.env.DEV && (
            <div style={{ marginTop: 16 }}>
              <DemoAccounts disabled={redirecting} onPick={(username) => startLogin(username)} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

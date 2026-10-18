import { Button, Flex, Result } from "antd";

import { logout } from "../oidc";

interface Props {
  errorCode: "AUTH_USER_INACTIVE" | "AUTH_USER_NOT_PROVISIONED";
  onRetry: () => void;
  retrying?: boolean;
}

export function AccountBlockedPage({ errorCode, onRetry, retrying }: Props) {
  const logoutButton = (
    <Button key="logout" onClick={() => void logout()}>
      Đăng xuất
    </Button>
  );

  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh", padding: 16 }}>
      {errorCode === "AUTH_USER_INACTIVE" ? (
        <Result
          status="403"
          title="Tài khoản đã bị vô hiệu hóa"
          subTitle="Liên hệ Quản trị hệ thống nếu đây là nhầm lẫn."
          extra={[logoutButton]}
        />
      ) : (
        <Result
          status="warning"
          title="Tài khoản chưa sẵn sàng"
          subTitle={
            <>
              Tài khoản chưa được gán phòng ban nên chưa dùng được PortFlow.
              <br />
              Quản trị cần đặt thuộc tính <b>department</b> cho bạn trong Keycloak.
            </>
          }
          extra={[
            <Button key="retry" type="primary" loading={retrying} onClick={onRetry}>
              Thử lại
            </Button>,
            logoutButton,
          ]}
        />
      )}
    </Flex>
  );
}

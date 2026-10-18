import { useEffect, useState } from "react";
import { Button, Modal, Typography } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";

import { login } from "../oidc";
import { onSessionExpired } from "../sessionEvents";

export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const location = useLocation();

  useEffect(() => onSessionExpired(() => setOpen(true)), []);

  const relogin = () => {
    setRedirecting(true);
    login({ returnTo: location.pathname + location.search }).catch(() => setRedirecting(false));
  };

  return (
    <Modal
      open={open}
      closable={false}
      mask={{ closable: false }}
      keyboard={false}
      centered
      width={420}
      title={
        <span>
          <ClockCircleOutlined style={{ color: "var(--pf-warning)", marginInlineEnd: 8 }} />
          Phiên đăng nhập đã hết hạn
        </span>
      }
      footer={
        <Button type="primary" loading={redirecting} onClick={relogin}>
          Đăng nhập lại
        </Button>
      }
    >
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        Vì lý do bảo mật, bạn cần đăng nhập lại để tiếp tục. Sau khi đăng nhập bạn sẽ quay về đúng
        trang này.
      </Typography.Paragraph>
    </Modal>
  );
}

import { Button, Result } from "antd";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="404 - Không tìm thấy trang"
      subTitle="Trang bạn tìm không tồn tại hoặc đã được chuyển đi."
      extra={
        <Link to="/">
          <Button type="primary">Về Inbox</Button>
        </Link>
      }
    />
  );
}

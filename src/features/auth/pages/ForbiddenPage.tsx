import { Button, Result } from "antd";
import { Link } from "react-router-dom";

export function ForbiddenPage() {
  return (
    <Result
      status="403"
      title="Access denied"
      subTitle="You do not have permission to access this page. Contact an administrator if you need access."
      extra={
        <Link to="/">
          <Button type="primary">Về Inbox</Button>
        </Link>
      }
    />
  );
}

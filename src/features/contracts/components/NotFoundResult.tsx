import { Button, Result } from "antd";
import { Link } from "react-router-dom";

import { errorMessage, statusOf } from "@/shared/lib/problem";

export function LoadErrorResult({
  error,
  backTo,
  backLabel,
}: {
  error: unknown;
  backTo: string;
  backLabel: string;
}) {
  const notFound = statusOf(error) === 404;
  return (
    <Result
      status={notFound ? "404" : "error"}
      title={notFound ? "Not found" : "Could not load data"}
      subTitle={errorMessage(error)}
      extra={
        <Link to={backTo}>
          <Button type="primary">{backLabel}</Button>
        </Link>
      }
    />
  );
}

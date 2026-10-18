import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Flex, Result } from "antd";

import { errorCodeOf, errorMessage, statusOf } from "@/shared/lib/problem";

import { fetchMe, meQueryKey } from "./api/me";
import { AppSkeleton } from "./components/AppSkeleton";
import { AccountBlockedPage } from "./pages/AccountBlockedPage";
import { createSession, SessionContext } from "./session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,

    retry: (failureCount, error) => {
      const status = statusOf(error);
      return status !== 401 && status !== 403 && failureCount < 1;
    },
  });
  const session = useMemo(() => (query.data ? createSession(query.data) : null), [query.data]);

  if (query.isError) {
    const code = errorCodeOf(query.error);
    if (code === "AUTH_USER_INACTIVE" || code === "AUTH_USER_NOT_PROVISIONED") {
      return (
        <AccountBlockedPage
          errorCode={code}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      );
    }
    if (statusOf(query.error) === 401) return <AppSkeleton />;
    if (!session) {
      return (
        <Flex align="center" justify="center" style={{ minHeight: "100vh", padding: 16 }}>
          <Result
            status="500"
            title="Không kết nối được máy chủ PortFlow"
            subTitle={errorMessage(query.error)}
            extra={
              <Button
                type="primary"
                loading={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Thử lại
              </Button>
            }
          />
        </Flex>
      );
    }
  }
  if (!session) return <AppSkeleton />;
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

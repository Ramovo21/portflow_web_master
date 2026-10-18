import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { AppSkeleton } from "../components/AppSkeleton";
import { restoreSession } from "../oidc";
import { loginPath } from "../returnTo";
import { SessionProvider } from "../SessionProvider";
import { useAuthStatus } from "../useAuthStatus";

export function RequireAuth() {
  const status = useAuthStatus();
  const location = useLocation();

  useEffect(() => {
    void restoreSession();
  }, []);

  if (status === "loading") return <AppSkeleton />;
  if (status === "anonymous") {
    const returnTo = location.pathname + location.search + location.hash;
    return <Navigate to={loginPath(returnTo)} replace />;
  }
  return (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  );
}

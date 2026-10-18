import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { hasAuthParams } from "react-oidc-context";

import { FullPageSpinner } from "../components/FullPageSpinner";
import { completeLogin } from "../oidc";
import { loginPath } from "../returnTo";

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasAuthParams()) {
      navigate("/", { replace: true });
      return;
    }
    completeLogin().then(
      (returnTo) => navigate(returnTo, { replace: true }),
      () => navigate(loginPath(undefined, "callback-error"), { replace: true }),
    );
  }, [navigate]);

  return <FullPageSpinner tip="Signing in…" />;
}

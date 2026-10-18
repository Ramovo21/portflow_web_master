import { installHttpAuth } from "@/shared/lib/http";
import { queryClient } from "@/shared/lib/queryClient";

import { meQueryKey } from "./api/me";
import { accessToken, renewToken, userManager } from "./oidc";
import { emitSessionExpired } from "./sessionEvents";

export function setupAuth() {
  installHttpAuth({
    accessToken,
    renew: renewToken,
    onSessionExpired: emitSessionExpired,

    onAccountBlocked: () => void queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
  userManager.events.addSilentRenewError(emitSessionExpired);
}

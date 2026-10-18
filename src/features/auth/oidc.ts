import { useSyncExternalStore } from "react";
import {
  ErrorResponse,
  InMemoryWebStorage,
  UserManager,
  WebStorageStateStore,
  type User,
} from "oidc-client-ts";

import { safeReturnTo } from "./returnTo";

export const oidcConfig = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY ?? "http://localhost:8180/realms/portflow",
  clientId: import.meta.env.VITE_OIDC_CLIENT_ID ?? "portflow-web",
};

export const CALLBACK_PATH = "/auth/callback";
export const SILENT_CALLBACK_PATH = "/auth/silent";

export type LoginReason = "logged-out" | "session-expired" | "idp-unavailable" | "callback-error";

const origin = window.location.origin;

export const userManager = new UserManager({
  authority: oidcConfig.authority,
  client_id: oidcConfig.clientId,
  redirect_uri: origin + CALLBACK_PATH,
  silent_redirect_uri: origin + SILENT_CALLBACK_PATH,
  post_logout_redirect_uri: `${origin}/login?reason=logged-out`,
  scope: "openid profile email",

  userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
  automaticSilentRenew: true,
  silentRequestTimeoutInSeconds: 5,
  monitorSession: false,
  loadUserInfo: false,
});

type RestoreStatus = "pending" | "done";

let restoreStatus: RestoreStatus = "pending";
let restorePromise: Promise<void> | undefined;
let idpUnavailable = false;
const restoreListeners = new Set<() => void>();

function setRestoreDone() {
  restoreStatus = "done";
  restoreListeners.forEach((listener) => listener());
}

export function restoreSession(): Promise<void> {
  restorePromise ??= (async () => {
    try {
      if (!(await userManager.getUser())) await userManager.signinSilent();
    } catch (error) {
      idpUnavailable = !(error instanceof ErrorResponse);
    } finally {
      setRestoreDone();
    }
  })();
  return restorePromise;
}

export function useRestoreStatus(): RestoreStatus {
  return useSyncExternalStore(
    (listener) => {
      restoreListeners.add(listener);
      return () => restoreListeners.delete(listener);
    },
    () => restoreStatus,
  );
}

export function isIdpUnavailable() {
  return idpUnavailable;
}

interface LoginState {
  returnTo?: string;
}

export async function login(options: { returnTo?: string | null; loginHint?: string } = {}) {
  const state: LoginState = { returnTo: safeReturnTo(options.returnTo) };
  await userManager.signinRedirect({ state, login_hint: options.loginHint });
}

let callbackPromise: Promise<string> | undefined;

export function completeLogin(): Promise<string> {
  callbackPromise ??= userManager.signinCallback().then((user) => {
    setRestoreDone();
    return safeReturnTo((user?.state as LoginState | undefined)?.returnTo);
  });
  return callbackPromise;
}

const channel =
  typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel("portflow-auth");

channel?.addEventListener("message", (event: MessageEvent) => {
  if (event.data === "logout") {
    void userManager.removeUser().finally(() => window.location.assign("/login?reason=logged-out"));
  }
});

export async function logout() {
  channel?.postMessage("logout");
  try {
    await userManager.signoutRedirect();
  } catch {
    await userManager.removeUser();
    window.location.assign("/login?reason=logged-out");
  }
}

let renewing: Promise<boolean> | undefined;

export function renewToken(): Promise<boolean> {
  renewing ??= userManager
    .signinSilent()
    .then((user: User | null) => !!user)
    .catch(() => false)
    .finally(() => {
      renewing = undefined;
    });
  return renewing;
}

export async function accessToken(): Promise<string | undefined> {
  const user = await userManager.getUser();
  return user && !user.expired ? user.access_token : undefined;
}

export const accountConsoleUrl = `${oidcConfig.authority}/account`;

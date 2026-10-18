import axios, { type InternalAxiosRequestConfig } from "axios";

import { errorCodeOf } from "./problem";

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

export interface HttpAuth {
  accessToken(): Promise<string | undefined>;

  renew(): Promise<boolean>;
  onSessionExpired(): void;
  onAccountBlocked(): void;
}

let auth: HttpAuth | undefined;

export function installHttpAuth(value: HttpAuth | undefined) {
  auth = value;
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 10_000,
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

http.interceptors.request.use(async (config) => {
  if (!config.skipAuth && auth) {
    const token = await auth.accessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || !error.response || !error.config || !auth) throw error;
  const config = error.config as RetriableConfig;
  if (config.skipAuth) throw error;
  const code = errorCodeOf(error);

  if (error.response.status === 401) {
    if (!config._retried && code !== "AUTH_INVALID_TOKEN" && (await auth.renew())) {
      config._retried = true;
      return http(config);
    }
    auth.onSessionExpired();
  } else if (
    error.response.status === 403 &&
    (code === "AUTH_USER_INACTIVE" || code === "AUTH_USER_NOT_PROVISIONED")
  ) {
    auth.onAccountBlocked();
  }
  throw error;
});

import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { AxiosError } from "axios";

import { http, installHttpAuth, type HttpAuth } from "./http";

function problem(config: InternalAxiosRequestConfig, status: number, errorCode: string) {
  const response = { status, statusText: "", headers: {}, config, data: { status, errorCode } };
  return new AxiosError("fail", undefined, config, undefined, response);
}

describe("http interceptor", () => {
  let token: string;
  let auth: HttpAuth & { renew: ReturnType<typeof vi.fn> };
  const seen: (string | undefined)[] = [];

  beforeEach(() => {
    token = "old";
    seen.length = 0;
    auth = {
      accessToken: vi.fn(async () => token),
      renew: vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        token = "new";
        return true;
      }),
      onSessionExpired: vi.fn(),
      onAccountBlocked: vi.fn(),
    };
    installHttpAuth(auth);

    const adapter: AxiosAdapter = async (config) => {
      const header = config.headers.Authorization as string | undefined;
      seen.push(header);
      if (header !== "Bearer new") throw problem(config, 401, "AUTH_TOKEN_EXPIRED");
      return { status: 200, statusText: "OK", headers: {}, config, data: { ok: true } };
    };
    http.defaults.adapter = adapter;
  });

  afterEach(() => installHttpAuth(undefined));

  it("gắn Bearer, renew khi 401 rồi gửi lại", async () => {
    const res = await http.get("/v1/me");
    expect(res.data).toEqual({ ok: true });
    expect(seen).toEqual(["Bearer old", "Bearer new"]);
    expect(auth.onSessionExpired).not.toHaveBeenCalled();
  });

  it("không gắn Bearer cho request công khai", async () => {
    await expect(http.get("/health", { skipAuth: true })).rejects.toThrow();
    expect(seen).toEqual([undefined]);
    expect(auth.renew).not.toHaveBeenCalled();
  });

  it("renew thất bại → báo hết phiên", async () => {
    auth.renew.mockResolvedValue(false);
    await expect(http.get("/v1/me")).rejects.toThrow();
    expect(auth.onSessionExpired).toHaveBeenCalledOnce();
  });

  it("AUTH_INVALID_TOKEN không renew", async () => {
    http.defaults.adapter = async (config) => {
      throw problem(config, 401, "AUTH_INVALID_TOKEN");
    };
    await expect(http.get("/v1/me")).rejects.toThrow();
    expect(auth.renew).not.toHaveBeenCalled();
    expect(auth.onSessionExpired).toHaveBeenCalledOnce();
  });

  it("403 tài khoản bị khóa → báo onAccountBlocked", async () => {
    http.defaults.adapter = async (config) => {
      throw problem(config, 403, "AUTH_USER_INACTIVE");
    };
    await expect(http.get("/v1/contracts")).rejects.toThrow();
    expect(auth.onAccountBlocked).toHaveBeenCalledOnce();
  });
});

import type { User } from "oidc-client-ts";

import { renewToken, userManager } from "./oidc";

describe("renewToken", () => {
  afterEach(() => vi.restoreAllMocks());

  it("các lời gọi đồng thời dùng chung một lần signinSilent", async () => {
    const silent = vi
      .spyOn(userManager, "signinSilent")
      .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({} as User), 5)));
    const results = await Promise.all([renewToken(), renewToken(), renewToken()]);
    expect(results).toEqual([true, true, true]);
    expect(silent).toHaveBeenCalledOnce();
  });

  it("thất bại → false, lần sau thử lại", async () => {
    const silent = vi
      .spyOn(userManager, "signinSilent")
      .mockRejectedValue(new Error("login_required"));
    expect(await renewToken()).toBe(false);
    expect(await renewToken()).toBe(false);
    expect(silent).toHaveBeenCalledTimes(2);
  });
});

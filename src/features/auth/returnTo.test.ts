import { loginPath, safeReturnTo } from "./returnTo";

describe("safeReturnTo", () => {
  it.each([
    ["/contracts/1?tab=a", "/contracts/1?tab=a"],
    [null, "/"],
    ["", "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["/login?reason=x", "/"],
    ["/auth/callback", "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });
});

describe("loginPath", () => {
  it("bỏ returnTo về trang chủ", () => {
    expect(loginPath("/")).toBe("/login");
  });

  it("encodes returnTo and reason", () => {
    expect(loginPath("/contracts?x=1", "session-expired")).toBe(
      "/login?returnTo=%2Fcontracts%3Fx%3D1&reason=session-expired",
    );
  });
});

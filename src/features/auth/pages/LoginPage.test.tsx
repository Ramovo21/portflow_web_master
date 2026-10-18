import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { AppProviders } from "@/app/providers";
import { LoginPage } from "@/features/auth";

const oidc = vi.hoisted(() => ({
  login: vi.fn(() => Promise.resolve()),
  restoreSession: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/features/auth/oidc", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  login: oidc.login,
  restoreSession: oidc.restoreSession,
}));

function renderLogin(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <LoginPage /> },
      { path: "*", element: <div>app</div> },
    ],
    { initialEntries: [path] },
  );
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bấm Đăng nhập → chuyển sang Keycloak, giữ returnTo", async () => {
    renderLogin("/login?returnTo=%2Fcontracts%2F1");
    await userEvent.click(await screen.findByRole("button", { name: /Đăng nhập/ }));
    expect(oidc.login).toHaveBeenCalledWith({ returnTo: "/contracts/1", loginHint: undefined });
  });

  it.each([
    ["logged-out", "You have been signed out."],
    ["session-expired", "Your session has expired. Please sign in again."],
    ["callback-error", /Sign-in failed/],
    ["idp-unavailable", /Could not reach the sign-in server/],
  ])("reason=%s hiện thông báo", async (reason, text) => {
    renderLogin(`/login?reason=${reason}`);
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(oidc.restoreSession).not.toHaveBeenCalled();
  });

  it("không có reason → thử khôi phục phiên SSO", async () => {
    renderLogin("/login");
    await screen.findByRole("button", { name: /Đăng nhập/ });
    expect(oidc.restoreSession).toHaveBeenCalled();
  });

  it("Keycloak không truy cập được → báo lỗi, bật lại nút", async () => {
    oidc.login.mockRejectedValueOnce(new Error("Failed to fetch"));
    renderLogin("/login");
    await userEvent.click(await screen.findByRole("button", { name: /Đăng nhập/ }));
    expect(await screen.findByText(/Could not reach the sign-in server/)).toBeInTheDocument();
  });

  it("tài khoản demo (dev) điền sẵn username qua login_hint", async () => {
    renderLogin("/login");
    await userEvent.click(await screen.findByText(/Tài khoản demo/));
    await userEvent.click(await screen.findByText("legal01"));
    expect(oidc.login).toHaveBeenCalledWith({ returnTo: null, loginHint: "legal01" });
  });
});

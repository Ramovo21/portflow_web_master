import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { AppProviders } from "@/app/providers";
import { routes } from "@/app/router";
import type { Me } from "@/features/auth";
import { queryClient } from "@/shared/lib/queryClient";
import { meFixture } from "@/test/fixtures";

const mocks = vi.hoisted(() => ({
  status: "authenticated" as "loading" | "authenticated" | "anonymous",
  fetchMe: vi.fn<() => Promise<Me>>(),
  logout: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/features/auth/useAuthStatus", () => ({ useAuthStatus: () => mocks.status }));
vi.mock("@/features/auth/api/me", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchMe: mocks.fetchMe,
}));
vi.mock("@/features/auth/oidc", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  restoreSession: () => Promise.resolve(),
  logout: mocks.logout,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

function forbidden(errorCode: string) {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError("403", undefined, config, undefined, {
    status: 403,
    statusText: "",
    headers: {},
    config,
    data: { status: 403, errorCode },
  });
}

describe("router + phiên đăng nhập", () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    mocks.status = "authenticated";
    mocks.fetchMe.mockResolvedValue(meFixture());
  });

  it("chưa đăng nhập → /login kèm returnTo", async () => {
    mocks.status = "anonymous";
    const router = renderAt("/contracts?page=2");
    await screen.findByRole("button", { name: /Đăng nhập/ });
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe("?returnTo=%2Fcontracts%3Fpage%3D2");
  });

  it("đã đăng nhập → Inbox chào theo tên, header có menu người dùng", async () => {
    renderAt("/");
    expect(await screen.findByText(/Trần Thị Bình$/, { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu người dùng" })).toHaveTextContent("TB");
  });

  it("menu trái chỉ có mục được phép", async () => {
    renderAt("/");
    const nav = await screen.findByRole("menu");
    expect(within(nav).getByText("Hợp đồng")).toBeInTheDocument();
    expect(within(nav).getByText("Bảng giá")).toBeInTheDocument();
    expect(within(nav).queryByText("Thanh toán")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Quản trị")).not.toBeInTheDocument();
  });

  it("vào URL không có quyền → trang 403 trong layout", async () => {
    renderAt("/admin/users");
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("nút theo quyền: có Contract.Create thấy 'Tạo hợp đồng'", async () => {
    renderAt("/contracts");
    await screen.findByText("Hợp đồng", { selector: "h3" });

    expect((await screen.findAllByText("Tạo hợp đồng")).length).toBeGreaterThan(0);
  });

  it("không có Contract.Create → ẩn nút", async () => {
    mocks.fetchMe.mockResolvedValue(meFixture({ permissions: ["Contract.Read"] }));
    renderAt("/contracts");
    await screen.findByText("Hợp đồng", { selector: "h3" });
    expect(screen.queryByRole("button", { name: /Tạo hợp đồng/ })).not.toBeInTheDocument();
  });

  it("/me 403 AUTH_USER_INACTIVE → trang tài khoản bị vô hiệu", async () => {
    mocks.fetchMe.mockRejectedValue(forbidden("AUTH_USER_INACTIVE"));
    renderAt("/");
    expect(await screen.findByText("Tài khoản đã bị vô hiệu hóa")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(mocks.logout).toHaveBeenCalled();
  });

  it("/me 403 AUTH_USER_NOT_PROVISIONED → hướng dẫn gán phòng ban + Thử lại", async () => {
    mocks.fetchMe.mockRejectedValueOnce(forbidden("AUTH_USER_NOT_PROVISIONED"));
    renderAt("/");
    expect(await screen.findByText("Tài khoản chưa sẵn sàng")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText(/Trần Thị Bình$/, { selector: "h3" })).toBeInTheDocument();
  });

  it("đang được ủy quyền → banner + thẻ trong trang tài khoản", async () => {
    mocks.fetchMe.mockResolvedValue(
      meFixture({
        actingFor: [
          {
            userId: "u7",
            fullName: "Võ Thị Giang",
            documentTypes: ["CONTRACT"],
            validTo: "2026-11-05",
          },
        ],
      }),
    );
    renderAt("/account");
    expect(await screen.findByText(/Bạn đang được ủy quyền thay mặt/)).toBeInTheDocument();
    expect(screen.getByText("Võ Thị Giang – đến 05/11/2026")).toBeInTheDocument();
    expect(
      screen.getByText("Hợp đồng", { selector: ".ant-alert-description" }),
    ).toBeInTheDocument();
  });

  it("đường dẫn lạ → 404", async () => {
    renderAt("/khong-ton-tai");
    expect(await screen.findByText("404 - Không tìm thấy trang")).toBeInTheDocument();
  });
});

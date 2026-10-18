import { oidcConfig } from "@/features/auth/oidc";

/**
 * Trang quản lý user của realm trong Keycloak Admin Console (tạo user, gán role, đặt thuộc tính department).
 * Đăng nhập bằng tài khoản quản trị Keycloak – realm `master` (dev: admin/admin) – chứ không phải user PortFlow:
 * user của realm nghiệp vụ không có quyền realm-management nên console báo "permission needed: query-users".
 * Môi trường có realm quản trị khác thì đặt `VITE_KEYCLOAK_ADMIN_CONSOLE_URL`.
 */
export function keycloakUsersConsoleUrl(
  authority = oidcConfig.authority,
  override = import.meta.env.VITE_KEYCLOAK_ADMIN_CONSOLE_URL,
): string {
  if (override) return override;
  const url = new URL(authority);
  const realm = url.pathname.split("/").filter(Boolean).pop() ?? "portflow";
  return `${url.origin}/admin/master/console/#/${realm}/users`;
}

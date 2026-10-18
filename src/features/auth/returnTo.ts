export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  if (value.startsWith("/login") || value.startsWith("/auth/")) return "/";
  return value;
}

export function loginPath(returnTo?: string, reason?: string): string {
  const params = new URLSearchParams();
  if (returnTo && safeReturnTo(returnTo) !== "/") params.set("returnTo", returnTo);
  if (reason) params.set("reason", reason);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

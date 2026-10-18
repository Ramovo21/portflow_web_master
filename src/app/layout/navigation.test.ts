import { activeNavItem, NAVIGATION, visibleNavigation } from "./navigation";

const paths = (permissions: string[]) =>
  visibleNavigation(NAVIGATION, (p) => permissions.includes(p)).flatMap((group) =>
    group.items.map((item) => item.path),
  );

describe("visibleNavigation", () => {
  it("chỉ hiện mục có quyền, ẩn nhóm rỗng", () => {
    expect(paths(["Contract.Read"])).toEqual(["/", "/contracts"]);
  });

  it("admin thấy nhóm Quản trị, không thấy nghiệp vụ", () => {
    const visible = visibleNavigation(NAVIGATION, (p) =>
      [
        "User.Admin",
        "Role.Admin",
        "DocumentType.Admin",
        "Workflow.Admin",
        "Delegation.Manage",
      ].includes(p),
    );
    expect(visible.map((group) => group.key)).toEqual(["work", "admin"]);
  });

  it("hàng đợi sự kiện (outbox) chỉ hiện với System.Admin", () => {
    expect(paths(["User.Admin"])).not.toContain("/admin/outbox");
    expect(paths(["System.Admin"])).toEqual(["/", "/admin/outbox"]);
  });
});

describe("activeNavItem", () => {
  it.each([
    ["/", "/"],
    ["/contracts/123", "/contracts"],
    ["/admin/roles", "/admin/roles"],
    ["/account", "/account"],
    ["/contractsx", undefined],
  ])("%s → %s", (pathname, expected) => {
    expect(activeNavItem(pathname)?.item.path).toBe(expected);
  });
});

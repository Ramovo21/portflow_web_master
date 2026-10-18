import { initials, roleLabel } from "./labels";

describe("labels", () => {
  it("lấy chữ đầu của họ và tên", () => {
    expect(initials("Trần Thị Bình")).toBe("TB");
    expect(initials("admin")).toBe("A");
    expect(initials("  ")).toBe("?");
  });

  it("role lạ hiện nguyên mã", () => {
    expect(roleLabel("SALES")).toBe("NV Kinh doanh");
    expect(roleLabel("CUSTOM_ROLE")).toBe("CUSTOM_ROLE");
  });
});

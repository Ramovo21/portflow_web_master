import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { renderWithProviders } from "@/test/render";

import { meFixture } from "@/test/fixtures";

import type { Customer, CustomerListItem } from "./api/customers";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { CustomerListPage } from "./pages/CustomerListPage";
import { normalizeTaxCode, customerSchema } from "./schema";

const api = vi.hoisted(() => ({
  fetchCustomers: vi.fn(),
  fetchCustomer: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  suspendCustomer: vi.fn(),
  reactivateCustomer: vi.fn(),
  checkTaxCode: vi.fn(),
  fetchCustomerContracts: vi.fn(),
  fetchCustomerPriceLists: vi.fn(),
  fetchCustomerOverview: vi.fn(),
}));
vi.mock("./api/customers", () => api);

const item: CustomerListItem = {
  id: "c-1",
  code: "KH000123",
  name: "Công ty TNHH Vận tải Biển Xanh",
  taxCode: "0101234567",
  address: "12 Nguyễn Tất Thành",
  status: "ACTIVE",
  ownerDepartmentId: "d-1",
  createdAt: "2026-10-20T03:15:00Z",
  version: 0,
};

const customer: Customer = {
  ...item,
  representative: { fullName: "Trần Văn A", position: "Giám đốc" },
  contacts: [
    { name: "Lê Thị B", email: "b@x.vn", phone: "0903000111", role: "Kế toán", primary: true },
  ],
  statusReason: null,
  updatedAt: "2026-11-12T01:02:00Z",
};

function problem(status: number, errorCode: string, detail = errorCode) {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError(String(status), undefined, config, undefined, {
    status,
    statusText: "",
    headers: {},
    config,
    data: { errorCode, detail, status },
  });
}

const page = (items: CustomerListItem[]) => ({ items, total: items.length, page: 0, size: 20 });

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchCustomers.mockResolvedValue(page([item]));
  api.fetchCustomer.mockResolvedValue(customer);
  api.checkTaxCode.mockResolvedValue({ taxCode: "0309876543", exists: false });
  api.fetchCustomerContracts.mockResolvedValue({ items: [], total: 0, page: 0, size: 10 });
  api.fetchCustomerPriceLists.mockResolvedValue({ items: [], total: 0, page: 0, size: 50 });
  api.fetchCustomerOverview.mockResolvedValue({
    customer: { ...item, statusReason: null },
    sections: {},
    warnings: [],
    unavailable: [],
  });
});

describe("schema", () => {
  it("chuẩn hóa MST như backend", () => {
    expect(normalizeTaxCode("0101 234.567")).toBe("0101234567");
  });

  it("có liên hệ thì phải đúng một liên hệ chính", () => {
    const base = {
      name: "X",
      contacts: [
        { name: "A", primary: true },
        { name: "B", primary: true },
      ],
    };
    expect(customerSchema.safeParse(base).success).toBe(false);
    expect(
      customerSchema.safeParse({ ...base, contacts: [{ name: "A", primary: true }] }).success,
    ).toBe(true);
  });
});

describe("CustomerListPage", () => {
  it("hiện danh sách và ghi bộ lọc lên URL", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderWithProviders(<CustomerListPage />, {
      route: "/customers",
      path: "/customers",
    });

    expect(await screen.findByText("Công ty TNHH Vận tải Biển Xanh")).toBeInTheDocument();
    expect(screen.getByText("Phạm vi: Phòng Kinh doanh")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Tìm khách hàng"), "Biển");
    await waitFor(() => expect(router.state.location.search).toContain("q=Bi%E1%BB%83n"));
    await user.click(screen.getByText("Tạm ngưng"));
    await waitFor(() => expect(router.state.location.search).toContain("status=SUSPENDED"));
    expect(api.fetchCustomers).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "SUSPENDED", q: "Biển" }),
    );
  });

  it("ẩn nút Thêm khi không có Customer.Create", async () => {
    renderWithProviders(<CustomerListPage />, {
      me: meFixture({ permissions: ["Customer.Read"] }),
    });
    await screen.findByText("Công ty TNHH Vận tải Biển Xanh");
    expect(screen.queryByRole("button", { name: /Thêm khách hàng/ })).not.toBeInTheDocument();
  });
});

describe("CustomerFormDrawer (tạo)", () => {
  const me = meFixture({ permissions: ["Customer.Read", "Customer.Create"] });

  async function openDrawer() {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<CustomerListPage />, { me, route: "/customers", path: "/customers" });
    await screen.findByText("Công ty TNHH Vận tải Biển Xanh");
    await user.click(screen.getAllByRole("button", { name: /Thêm khách hàng/ })[0]);
    const drawer = await screen.findByRole("dialog");
    return { user, drawer };
  }

  it("báo lỗi MST sai định dạng", async () => {
    const { user, drawer } = await openDrawer();
    await user.type(within(drawer).getByLabelText("Mã số thuế"), "12345");
    await user.tab();
    expect(
      await within(drawer).findByText(
        "The tax code must be 10 digits, or 13 digits in the format 0101234567-001",
      ),
    ).toBeInTheDocument();
  });

  it("gửi MST đã chuẩn hóa, đúng một liên hệ chính và Idempotency-Key", async () => {
    api.createCustomer.mockResolvedValue({ ...customer, id: "c-2", code: "KH000124" });
    const { user, drawer } = await openDrawer();
    await user.type(within(drawer).getByLabelText("Tên khách hàng"), "Cty Sao Mai");
    await user.type(within(drawer).getByLabelText("Mã số thuế"), "0309 876.543");
    await user.tab();
    expect(await within(drawer).findByText(/Chưa có trong hệ thống/)).toBeInTheDocument();

    await user.click(within(drawer).getByRole("button", { name: /Thêm/ }));
    await user.click(within(drawer).getByRole("button", { name: /Thêm/ }));
    await user.type(within(drawer).getByLabelText("Tên liên hệ 1"), "An");
    await user.type(within(drawer).getByLabelText("Tên liên hệ 2"), "Bình");
    await user.click(screen.getByRole("button", { name: "Lưu khách hàng" }));

    await waitFor(() => expect(api.createCustomer).toHaveBeenCalledTimes(1));
    const [payload, key] = api.createCustomer.mock.calls[0];
    expect(payload.taxCode).toBe("0309876543");
    expect(payload.contacts.map((c: { primary: boolean }) => c.primary)).toEqual([true, false]);
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("gắn lỗi CUS_TAX_CODE_DUPLICATE vào ô MST", async () => {
    api.createCustomer.mockRejectedValue(problem(409, "CUS_TAX_CODE_DUPLICATE"));
    const { user, drawer } = await openDrawer();
    await user.type(within(drawer).getByLabelText("Tên khách hàng"), "Cty trùng");
    await user.type(within(drawer).getByLabelText("Mã số thuế"), "0309876543");
    await user.click(screen.getByRole("button", { name: "Lưu khách hàng" }));
    expect(await within(drawer).findByText("Tax code already exists.")).toBeInTheDocument();
  });
});

describe("CustomerDetailPage", () => {
  it("suspending requires a reason of at least 10 characters", async () => {
    const user = userEvent.setup({ delay: null });
    const me = meFixture({ permissions: ["Customer.Read", "Customer.Update", "Customer.Suspend"] });
    api.suspendCustomer.mockResolvedValue({
      ...customer,
      status: "SUSPENDED",
      statusReason: "Nợ quá hạn 90 ngày",
    });
    renderWithProviders(<CustomerDetailPage />, {
      me,
      route: "/customers/c-1",
      path: "/customers/:id",
    });

    await screen.findByRole("heading", { name: "Công ty TNHH Vận tải Biển Xanh" });
    await user.click(screen.getByRole("button", { name: "Thêm thao tác" }));
    await user.click(await screen.findByText("Tạm ngưng…"));
    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText(/Hợp đồng đang hiệu lực VẪN chạy/)).toBeInTheDocument();

    await user.type(within(modal).getByLabelText("Lý do"), "Nợ quá");
    await user.click(within(modal).getByRole("button", { name: "Tạm ngưng" }));
    expect(await within(modal).findByText("At least 10 characters")).toBeInTheDocument();
    expect(api.suspendCustomer).not.toHaveBeenCalled();

    await user.type(within(modal).getByLabelText("Lý do"), " hạn 90 ngày");
    await user.click(within(modal).getByRole("button", { name: "Tạm ngưng" }));
    await waitFor(() =>
      expect(api.suspendCustomer).toHaveBeenCalledWith(
        "c-1",
        "Nợ quá hạn 90 ngày",
        expect.any(String),
      ),
    );
  });

  it("KH tạm ngưng: hiện banner và khóa nút Tạo hợp đồng", async () => {
    api.fetchCustomer.mockResolvedValue({
      ...customer,
      status: "SUSPENDED",
      statusReason: "Nợ quá hạn 90 ngày",
    });
    renderWithProviders(<CustomerDetailPage />, {
      me: meFixture({ permissions: ["Customer.Read", "Contract.Create"] }),
      route: "/customers/c-1",
      path: "/customers/:id",
    });
    expect(await screen.findByText(/Khách hàng đang tạm ngưng/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tạo hợp đồng/ })).toBeDisabled();
  });

  it("tab Tổng quan hiện KPI, cảnh báo sắp hết hạn và phần không tải được", async () => {
    api.fetchCustomerOverview.mockResolvedValue({
      customer: { ...item, statusReason: null },
      sections: {
        contracts: {
          total: 3,
          byStatus: { ACTIVE: 2, DRAFT: 1 },
          items: [
            {
              id: "k-1",
              number: "HD-2026-0001",
              title: "HĐ xếp dỡ",
              status: "ACTIVE",
              effectiveFrom: "2026-01-01",
              effectiveTo: "2026-11-02",
              value: 300000000,
              currency: "VND",
            },
          ],
        },
        priceLists: null,
      },
      warnings: [
        {
          code: "CONTRACT_EXPIRING",
          documentType: "CONTRACT",
          documentId: "k-1",
          reference: "HD-2026-0001",
          dueDate: "2026-11-02",
          daysLeft: 20,
        },
      ],
      unavailable: ["priceLists"],
    });
    renderWithProviders(<CustomerDetailPage />, {
      me: meFixture({ permissions: ["Customer.Read", "Contract.Read", "PriceList.Read"] }),
      route: "/customers/c-1",
      path: "/customers/:id",
    });

    expect(await screen.findByText("Tổng hợp đồng")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Hợp đồng HD-2026-0001 sắp hết hạn – còn 20 ngày/ }),
    ).toHaveAttribute("href", "/contracts/k-1");
    expect(screen.getByText("Tạm thời không tải được: Bảng giá")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "HD-2026-0001" })).toBeInTheDocument();
  });

  it("404 khi KH ngoài phạm vi", async () => {
    api.fetchCustomer.mockRejectedValue(problem(404, "CUS_NOT_FOUND"));
    renderWithProviders(<CustomerDetailPage />, { route: "/customers/x", path: "/customers/:id" });
    expect(
      await screen.findByText("Không tìm thấy khách hàng hoặc bạn không có quyền xem"),
    ).toBeInTheDocument();
  });
});

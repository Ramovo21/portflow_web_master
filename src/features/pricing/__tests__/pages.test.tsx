import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";

import { meFixture } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

import type { PriceListDetail } from "../api/priceLists";
import { CreatePriceListPage } from "../pages/CreatePriceListPage";
import { PriceListDetailPage } from "../pages/PriceListDetailPage";
import { PriceResolvePage } from "../pages/PriceResolvePage";

const mocks = vi.hoisted(() => ({
  fetchPriceList: vi.fn(),
  checkOverlap: vi.fn(),
  resolvePrices: vi.fn(),
}));

vi.mock("@/features/catalog/api/catalog", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchServiceGroups: vi.fn(() =>
    Promise.resolve([{ id: "g1", code: "STORAGE", name: "Lưu bãi", active: true }]),
  ),
  fetchServices: vi.fn(() =>
    Promise.resolve([
      {
        id: "s1",
        code: "STO-CONT-DAY",
        name: "Lưu bãi cont khô",
        groupCode: "STORAGE",
        uom: "CONT_DAY",
        defaultTaxRate: 0.08,
        mandatoryDefault: false,
        active: true,
      },
      {
        id: "s2",
        code: "TRUCK-TRIP",
        name: "Vận chuyển",
        groupCode: "TRUCKING",
        uom: "TRIP",
        defaultTaxRate: 0.08,
        mandatoryDefault: false,
        active: true,
      },
    ]),
  ),
}));

vi.mock("@/features/pricing/api/priceLists", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchPriceList: mocks.fetchPriceList,
  fetchPriceLists: vi.fn(() => Promise.resolve({ items: [], total: 0, page: 0, size: 20 })),
  fetchVersions: vi.fn(() => Promise.resolve([])),
  fetchComparison: vi.fn(() =>
    Promise.resolve({ left: {}, right: {}, lines: [], headerChanges: {} }),
  ),
  checkOverlap: mocks.checkOverlap,
  resolvePrices: mocks.resolvePrices,
}));

vi.mock("@/features/pricing/api/targets", () => ({
  searchCustomers: vi.fn(() => Promise.resolve([])),
  fetchCustomer: vi.fn(() =>
    Promise.resolve({
      id: "c1",
      code: "KH1",
      name: "Cty Biển Xanh",
      taxCode: "0101234567",
      status: "ACTIVE",
    }),
  ),
  searchContracts: vi.fn(() => Promise.resolve([])),
  fetchContract: vi.fn(() =>
    Promise.resolve({
      id: "k1",
      number: "HD-2026-0012",
      title: "HĐ xếp dỡ",
      customerId: "c1",
      customerName: "Cty Biển Xanh",
      status: "ACTIVE",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      services: [
        { serviceCode: "STO-CONT-DAY", mandatory: false },
        { serviceCode: "TRUCK-TRIP", mandatory: false },
      ],
    }),
  ),
}));

vi.mock("@/features/workflow/api/workflow", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchInstancesOfDocument: vi.fn(() => Promise.resolve([])),
}));

const SALES = meFixture({
  username: "sales01",
  roles: ["SALES"],
  permissions: ["PriceList.Read", "PriceList.Create", "PriceList.Submit"],
});

function priceList(overrides: Partial<PriceListDetail> = {}): PriceListDetail {
  return {
    id: "p1",
    code: "BG-2026-000123",
    scope: "CUSTOMER",
    scopeId: "c1",
    serviceType: "STORAGE",
    name: "Giá lưu bãi Biển Xanh",
    listVersion: 2,
    revisionNumber: 0,
    currency: "VND",
    status: "DRAFT",
    validFrom: "2026-10-15",
    validTo: null,
    usedInBilling: false,
    billedThrough: null,
    previousVersionId: null,
    supersededById: null,
    sourceAddendumId: null,
    ownerDepartmentId: SALES.department!.id,
    note: null,
    version: 3,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: null,
    lines: [
      {
        serviceCode: "STO-CONT-DAY",
        serviceName: "Lưu bãi cont khô",
        unitPrice: 85000,
        uom: "CONT_DAY",
        minQty: 0,
        note: null,
      },
    ],
    workflow: null,
    ...overrides,
  };
}

describe("CreatePriceListPage", () => {
  it("warns about overlap in real time and locks UoM to the catalog", async () => {
    mocks.checkOverlap.mockResolvedValue({ ok: false, conflicts: ["BG-2026-900001"] });
    renderWithProviders(<CreatePriceListPage />, {
      route: "/pricing/new?scope=GLOBAL",
      path: "/pricing/new",
      me: SALES,
    });

    expect(await screen.findByTestId("overlap-alert", {}, { timeout: 3000 })).toHaveTextContent(
      "BG-2026-900001",
    );
    expect(
      screen.getByRole("button", { name: /Tạo version mới từ BG-2026-900001/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lưu & gửi duyệt/ })).toBeDisabled();
    expect(mocks.checkOverlap).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "GLOBAL", serviceType: "*" }),
    );

    await userEvent.click(await screen.findByRole("button", { name: /Thêm tất cả dịch vụ/ }));
    expect(await screen.findByTestId("uom-STO-CONT-DAY")).toHaveTextContent("cont·ngày");
    expect(screen.getByTestId("uom-TRUCK-TRIP")).toHaveTextContent("chuyến");
  });
});

describe("PriceListDetailPage", () => {
  const renderDetail = (detail: PriceListDetail, me = SALES) => {
    mocks.fetchPriceList.mockResolvedValue(detail);
    return renderWithProviders(
      <Routes>
        <Route path="/pricing/:id" element={<PriceListDetailPage />} />
      </Routes>,
      { route: "/pricing/p1", me },
    );
  };

  it("shows submit and edit for an own draft", async () => {
    renderDetail(priceList());
    expect(await screen.findByText("BG-2026-000123 · v2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi duyệt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sửa thông tin/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sửa dòng giá/ })).toBeInTheDocument();
  });

  it("follows backend allowedActions and shows billing lock", async () => {
    renderDetail(
      priceList({
        status: "EFFECTIVE",
        usedInBilling: true,
        billedThrough: "2026-10-31",
        allowedActions: ["NEW_VERSION"],
      }),
    );
    expect(await screen.findByRole("button", { name: "Tạo version mới" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gửi duyệt/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sửa dòng giá/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Đã dùng tính tiền đến 31\/10\/2026/)).toBeInTheDocument();
  });

  it("offers revise on a rejected list and nothing to read-only users", async () => {
    renderDetail(priceList({ status: "REJECTED" }));
    expect(await screen.findByRole("button", { name: "Sửa lại" })).toBeInTheDocument();
  });

  it("hides all actions for a reader", async () => {
    renderDetail(priceList(), meFixture({ permissions: ["PriceList.Read"], dataScope: "ALL" }));
    await screen.findByText("BG-2026-000123 · v2");
    expect(
      screen.queryByRole("button", { name: /Gửi duyệt|Sửa thông tin|Thêm/ }),
    ).not.toBeInTheDocument();
  });
});

describe("PriceResolvePage", () => {
  it("renders price segments by scope and gaps", async () => {
    mocks.resolvePrices.mockResolvedValue({
      segments: [
        {
          serviceCode: "STO-CONT-DAY",
          from: "2026-10-01",
          to: "2026-10-14",
          unitPrice: 90000,
          currency: "VND",
          uom: "CONT_DAY",
          minQty: 0,
          priceListId: "k1v1",
          priceListVersion: 1,
          scope: "CONTRACT",
          sourceAddendumId: null,
        },
        {
          serviceCode: "STO-CONT-DAY",
          from: "2026-10-15",
          to: "2026-10-31",
          unitPrice: 80000,
          currency: "VND",
          uom: "CONT_DAY",
          minQty: 0,
          priceListId: "k1v2",
          priceListVersion: 2,
          scope: "CONTRACT",
          sourceAddendumId: "a1",
        },
      ],
      gaps: [{ serviceCode: "TRUCK-TRIP", from: "2026-10-01", to: "2026-10-31" }],
    });
    renderWithProviders(<PriceResolvePage />, {
      route: "/pricing/resolve?contractId=k1&from=2026-10-01&to=2026-10-31&run=1",
      path: "/pricing/resolve",
      me: SALES,
    });

    expect(await screen.findByText(/1 dịch vụ thiếu giá trong kỳ/)).toBeInTheDocument();
    expect(mocks.resolvePrices).toHaveBeenCalledWith({
      contractId: "k1",
      serviceCodes: ["STO-CONT-DAY", "TRUCK-TRIP"],
      from: "2026-10-01",
      to: "2026-10-31",
    });
    const row = screen.getByTestId("resolve-row-STO-CONT-DAY");
    expect(within(row).getAllByRole("button")).toHaveLength(2);
    expect(
      within(screen.getByTestId("resolve-row-TRUCK-TRIP")).getByText("THIẾU GIÁ"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tạo bảng giá HĐ/ })).toHaveAttribute(
      "href",
      "/pricing/new?scope=CONTRACT&scopeId=k1",
    );
  });
});

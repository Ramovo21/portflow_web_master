import { screen } from "@testing-library/react";

import { meFixture } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

import { CatalogPage } from "../pages/CatalogPage";

vi.mock("@/features/catalog/api/catalog", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchServiceGroups: vi.fn(() =>
    Promise.resolve([
      { id: "g1", code: "STORAGE", name: "Lưu bãi", active: true },
      { id: "g2", code: "TRUCKING", name: "Vận chuyển", active: true },
    ]),
  ),
  fetchServices: vi.fn(() =>
    Promise.resolve([
      {
        id: "s1",
        code: "STO-CONT-DAY",
        name: "Lưu bãi cont khô/ngày",
        groupCode: "STORAGE",
        uom: "CONT_DAY",
        defaultTaxRate: 0.08,
        mandatoryDefault: false,
        active: true,
      },
      {
        id: "s2",
        code: "TRUCK-TRIP",
        name: "Vận chuyển nội cảng",
        groupCode: "TRUCKING",
        uom: "TRIP",
        defaultTaxRate: 0.1,
        mandatoryDefault: true,
        active: true,
      },
      {
        id: "s3",
        code: "STO-DG-DAY",
        name: "Lưu bãi hàng nguy hiểm",
        groupCode: "STORAGE",
        uom: "CONT_DAY",
        defaultTaxRate: 0.08,
        mandatoryDefault: false,
        active: false,
      },
    ]),
  ),
}));

describe("CatalogPage", () => {
  it("lists active services with Vietnamese UoM and hides manage actions without ServiceCatalog.Manage", async () => {
    renderWithProviders(<CatalogPage />, { route: "/catalog", path: "/catalog" });

    expect(await screen.findByText("STO-CONT-DAY")).toBeInTheDocument();
    expect(screen.getByText("TRUCK-TRIP")).toBeInTheDocument();
    expect(screen.getAllByText("cont·ngày").length).toBeGreaterThan(0);
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.queryByText("STO-DG-DAY")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Dịch vụ/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thao tác/ })).not.toBeInTheDocument();
  });

  it("shows add buttons and row actions for catalog managers, filtered by group from the URL", async () => {
    renderWithProviders(<CatalogPage />, {
      route: "/catalog?group=STORAGE&inactive=1",
      path: "/catalog",
      me: meFixture({ roles: ["ADMIN"], permissions: ["ServiceCatalog.Manage"] }),
    });

    expect(await screen.findByText("STO-DG-DAY")).toBeInTheDocument();
    expect(screen.queryByText("TRUCK-TRIP")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dịch vụ/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nhóm/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Thao tác/ })).toHaveLength(2);
    expect(screen.getByText("Đã ngưng")).toBeInTheDocument();
  });
});

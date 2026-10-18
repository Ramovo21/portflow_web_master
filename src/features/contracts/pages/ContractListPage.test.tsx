import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/render";

import { listItemFixture } from "../test/fixtures";
import { ContractListPage } from "./ContractListPage";

const api = vi.hoisted(() => ({ fetchContracts: vi.fn() }));
vi.mock("../api/contracts", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...api,
}));
vi.mock("../api/lookups", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  searchCustomers: vi.fn(() => Promise.resolve([])),
}));

describe("ContractListPage", () => {
  beforeEach(() => {
    api.fetchContracts.mockImplementation((params: { status?: string; size: number }) =>
      Promise.resolve(
        params.status === "REVISION_REQUESTED" && params.size === 1
          ? { items: [], total: 2, page: 0, size: 1 }
          : { items: [listItemFixture()], total: 1, page: 0, size: 20 },
      ),
    );
  });

  it("hiện hợp đồng kèm bước hiện tại và người giữ (FR-K03)", async () => {
    renderWithProviders(<ContractListPage />, { route: "/contracts", path: "/contracts" });

    expect(await screen.findByText("HD-2026-0012")).toBeInTheDocument();
    expect(screen.getByText(/Bước 2\/3 · Pháp chế · Hoàng Văn Em/)).toBeInTheDocument();
    expect(screen.getByText("Đang duyệt", { selector: ".ant-tag" })).toBeInTheDocument();
  });

  it("lọc theo nhóm trạng thái và giữ trên URL", async () => {
    const { router } = renderWithProviders(<ContractListPage />, {
      route: "/contracts",
      path: "/contracts",
    });
    await screen.findByText("HD-2026-0012");

    await userEvent.click(screen.getByTitle("Đang hiệu lực"));

    await waitFor(() =>
      expect(api.fetchContracts).toHaveBeenCalledWith(
        expect.objectContaining({ status: "ACTIVE", page: 0 }),
      ),
    );
    expect(router.state.location.search).toContain("group=active");

    await userEvent.click(screen.getByTitle("Đang duyệt"));
    await waitFor(() =>
      expect(api.fetchContracts).toHaveBeenCalledWith(
        expect.objectContaining({ status: "SUBMITTED,UNDER_REVIEW" }),
      ),
    );
  });
});

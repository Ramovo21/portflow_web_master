import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/render";
import { meFixture } from "@/test/fixtures";

import { contractEndingIn, contractFixture, CONTRACT_ID } from "../test/fixtures";
import { AddendumDrawer } from "../components/AddendumDrawer";
import { ContractDetailPage } from "./ContractDetailPage";
import { EditContractPage } from "./EditContractPage";

const api = vi.hoisted(() => ({
  fetchContract: vi.fn(),
  updateContract: vi.fn(),
  submitContract: vi.fn(),
  fetchContractHistory: vi.fn(() => Promise.resolve([])),
  fetchContractVersions: vi.fn(() => Promise.resolve([])),
}));
vi.mock("../api/contracts", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...api,
}));
vi.mock("../api/addenda", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchAddenda: vi.fn(() => Promise.resolve([])),
}));
vi.mock("../api/lookups", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchServices: vi.fn(() =>
    Promise.resolve([
      {
        id: "s1",
        code: "CONT20_HANDLING",
        name: "Xếp dỡ cont 20'",
        groupCode: "CONT_HANDLING",
        uom: "CONT20",
        mandatoryDefault: true,
        active: true,
      },
    ]),
  ),
  fetchServiceGroups: vi.fn(() =>
    Promise.resolve([{ id: "g1", code: "CONT_HANDLING", name: "Xếp dỡ", active: true }]),
  ),
  searchCustomers: vi.fn(() => Promise.resolve([])),
  fetchCustomer: vi.fn(() =>
    Promise.resolve({
      id: "c",
      code: "KH900001",
      name: "Cty Biển Xanh",
      taxCode: "0101234567",
      status: "ACTIVE",
    }),
  ),
  resolvePrices: vi.fn(() => Promise.resolve({ segments: [], gaps: [] })),
}));
vi.mock("@/features/workflow/api/workflow", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchInstancesOfDocument: vi.fn(() => Promise.resolve([])),
}));

const me = meFixture({
  username: "sales01",
  permissions: [
    "Contract.Read",
    "Contract.Create",
    "Contract.Update",
    "Contract.Submit",
    "Customer.Read",
    "Addendum.Create",
  ],
});

describe("ContractDetailPage – nút theo allowedActions", () => {
  it("DRAFT có SUBMIT/UPDATE/DELETE → Gửi duyệt, Sửa, menu Xóa nháp", async () => {
    api.fetchContract.mockResolvedValue(contractFixture());
    renderWithProviders(<ContractDetailPage />, {
      me,
      route: `/contracts/${CONTRACT_ID}`,
      path: "/contracts/:id",
    });

    expect(await screen.findByRole("button", { name: "Gửi duyệt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sửa" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tạo phụ lục" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Thêm thao tác/ }));
    expect(await screen.findByText("Xóa nháp")).toBeInTheDocument();
    expect(screen.queryByText("Hủy hợp đồng")).not.toBeInTheDocument();
  });

  it("không có allowedActions → không có nút thao tác", async () => {
    api.fetchContract.mockResolvedValue(
      contractFixture({ status: "UNDER_REVIEW", allowedActions: [] }),
    );
    renderWithProviders(<ContractDetailPage />, {
      me,
      route: `/contracts/${CONTRACT_ID}`,
      path: "/contracts/:id",
    });

    await screen.findByText("HD-2026-0012");
    expect(screen.queryByRole("button", { name: "Gửi duyệt" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sửa" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thêm thao tác/ })).not.toBeInTheDocument();
  });

  it("ACTIVE còn ≤ 90 ngày → banner gợi ý gia hạn", async () => {
    api.fetchContract.mockResolvedValue(contractEndingIn(25));
    renderWithProviders(<ContractDetailPage />, {
      me,
      route: `/contracts/${CONTRACT_ID}`,
      path: "/contracts/:id",
    });

    const banner = await screen.findByTestId("banner-expiring");
    expect(within(banner).getByText(/25 days left/)).toBeInTheDocument();
    expect(within(banner).getByRole("button", { name: "Tạo phụ lục gia hạn" })).toBeInTheDocument();
  });
});

describe("EditContractPage – Lưu & gửi duyệt", () => {
  it("lưu (PUT kèm version) rồi gửi duyệt bằng request thứ hai", async () => {
    const contract = contractFixture();
    api.fetchContract.mockResolvedValue(contract);
    api.updateContract.mockResolvedValue({ ...contract, version: 4 });
    api.submitContract.mockResolvedValue({
      id: contract.id,
      status: "UNDER_REVIEW",
      revision: 1,
      workflow: {
        instanceId: "i",
        status: "RUNNING",
        round: 1,
        currentStep: {
          order: 1,
          name: "Rà soát KD",
          assignees: [{ id: "u", fullName: "Trần Thị Bình" }],
          dueAt: null,
        },
      },
    });
    renderWithProviders(<EditContractPage />, {
      me,
      route: `/contracts/${CONTRACT_ID}/edit`,
      path: "/contracts/:id/edit",
    });

    const submit = await screen.findByRole("button", { name: "Lưu & gửi duyệt" });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Lưu & gửi duyệt" })).toHaveLength(2),
    );
    await userEvent.click(screen.getAllByRole("button", { name: "Lưu & gửi duyệt" }).at(-1)!);

    await waitFor(() =>
      expect(api.submitContract).toHaveBeenCalledWith(contract.id, expect.any(String)),
    );
    expect(api.updateContract).toHaveBeenCalledWith(
      contract.id,
      3,
      expect.objectContaining({ title: contract.title }),
    );
  });

  it("chưa có dịch vụ → nút gửi duyệt bị khóa (checklist CTR-02)", async () => {
    api.fetchContract.mockResolvedValue(contractFixture({ services: [] }));
    renderWithProviders(<EditContractPage />, {
      me,
      route: `/contracts/${CONTRACT_ID}/edit`,
      path: "/contracts/:id/edit",
    });

    expect(await screen.findByTestId("ready-services")).toHaveAttribute("data-ok", "false");
    expect(screen.getByRole("button", { name: "Lưu & gửi duyệt" })).toBeDisabled();
  });
});

describe("AddendumDrawer – cửa sổ gia hạn CTR-X1", () => {
  it("còn 120 ngày → thẻ Gia hạn bị khóa kèm lý do", async () => {
    renderWithProviders(
      <AddendumDrawer contract={contractEndingIn(120)} open onClose={() => undefined} />,
      { me },
    );

    const card = await screen.findByRole("radio", { name: "Gia hạn" });
    expect(card).toHaveAttribute("aria-disabled", "true");
    expect(
      within(card).getByText(/extension is only allowed when ≤ 90 days remain/),
    ).toBeInTheDocument();
  });

  it("hết hạn 20 ngày → gia hạn được; loại khác bị khóa", async () => {
    renderWithProviders(
      <AddendumDrawer contract={contractEndingIn(-20)} open onClose={() => undefined} />,
      { me },
    );

    expect(await screen.findByRole("radio", { name: "Gia hạn" })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    expect(screen.getByRole("radio", { name: "Đổi đơn giá" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

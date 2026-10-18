import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { InboxItem } from "@/features/workflow";
import { meFixture } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

import { InboxPage } from "./InboxPage";

const api = vi.hoisted(() => ({
  fetchInbox: vi.fn(),
  fetchInboxCounters: vi.fn(),
}));
vi.mock("@/features/workflow/api/workflow", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchInbox: api.fetchInbox,
  fetchInboxCounters: api.fetchInboxCounters,
}));
vi.mock("@/features/workflow/api/demo", () => ({
  fetchDemoStatus: vi.fn().mockResolvedValue(null),
  submitDemo: vi.fn(),
}));

const item: InboxItem = {
  instanceId: "i-1",
  documentType: "CONTRACT",
  documentId: "c-1",
  status: "RUNNING",
  round: 2,
  number: "HD-2026-0012",
  title: "HĐ xếp dỡ container 2027",
  customerName: "Cty Biển Xanh",
  amount: 3_600_000_000,
  currency: "VND",
  submitterId: "u-sales",
  submitterName: "Nguyễn Văn An",
  submittedAt: "2026-11-10T02:00:00Z",
  stepId: "s-2",
  stepOrder: 2,
  stepName: "Pháp chế",
  startedAt: "2026-11-10T03:00:00Z",
  dueAt: "2020-01-01T00:00:00Z",
  overdue: true,
};

beforeEach(() => {
  api.fetchInbox.mockReset().mockResolvedValue({ items: [item], total: 1, page: 0, size: 20 });
  api.fetchInboxCounters.mockReset().mockResolvedValue({
    total: 1,
    overdue: 1,
    byDocumentType: [{ documentType: "CONTRACT", total: 1, overdue: 1 }],
  });
});

describe("InboxPage", () => {
  it("mặc định tab Chờ tôi duyệt và hiện dòng hồ sơ quá hạn", async () => {
    renderWithProviders(<InboxPage />);
    expect(await screen.findByText("HD-2026-0012")).toBeInTheDocument();
    expect(api.fetchInbox).toHaveBeenCalledWith(
      expect.objectContaining({ tab: "ASSIGNED", page: 0 }),
    );
    expect(document.querySelector("[data-sla=overdue]")).toHaveTextContent(/Quá hạn/);
    expect(screen.getByText("vòng 2")).toBeInTheDocument();
  });

  it("người không có quyền duyệt mặc định tab Tôi đã gửi", async () => {
    renderWithProviders(<InboxPage />, { me: meFixture({ permissions: ["Contract.Read"] }) });
    await waitFor(() =>
      expect(api.fetchInbox).toHaveBeenCalledWith(expect.objectContaining({ tab: "SUBMITTED" })),
    );
  });

  it("chuyển tab cập nhật URL", async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<InboxPage />);
    await screen.findByText("HD-2026-0012");
    await user.click(screen.getByRole("tab", { name: "Tôi đã gửi" }));
    await waitFor(() => expect(router.state.location.search).toContain("tab=SUBMITTED"));
    await waitFor(() =>
      expect(api.fetchInbox).toHaveBeenLastCalledWith(
        expect.objectContaining({ tab: "SUBMITTED" }),
      ),
    );
  });

  it("bấm dòng mở trang duyệt", async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<InboxPage />);
    await user.click(await screen.findByText("HD-2026-0012"));
    expect(router.state.location.pathname).toBe("/review/CONTRACT/c-1");
  });

  it("lọc chỉ quá hạn gửi overdue=true", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InboxPage />);
    await screen.findByText("HD-2026-0012");
    await user.click(screen.getByRole("checkbox", { name: "Chỉ quá hạn" }));
    await waitFor(() =>
      expect(api.fetchInbox).toHaveBeenLastCalledWith(expect.objectContaining({ overdue: true })),
    );
  });
});

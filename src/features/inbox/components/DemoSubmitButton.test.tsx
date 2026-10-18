import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/render";

import { DemoSubmitButton } from "./DemoSubmitButton";

const api = vi.hoisted(() => ({
  fetchDemoStatus: vi.fn(),
  submitDemo: vi.fn(),
}));
vi.mock("@/features/workflow/api/demo", () => api);

beforeEach(() => {
  api.fetchDemoStatus.mockReset();
  api.submitDemo.mockReset();
});

describe("DemoSubmitButton", () => {
  it("ẩn khi backend không bật chế độ demo", async () => {
    api.fetchDemoStatus.mockResolvedValue(null);
    renderWithProviders(<DemoSubmitButton onSubmitted={vi.fn()} />);
    await waitFor(() => expect(api.fetchDemoStatus).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /Tạo hồ sơ demo/ })).not.toBeInTheDocument();
  });

  it("trình duyệt hồ sơ demo kèm Idempotency-Key rồi báo về Inbox", async () => {
    api.fetchDemoStatus.mockResolvedValue({ enabled: true, documentType: "DEMO" });
    api.submitDemo.mockResolvedValue({
      documentId: "d-1",
      workflow: {
        instanceId: "i-1",
        status: "RUNNING",
        round: 1,
        currentStepId: "s-1",
        currentStepOrder: 1,
        currentStepName: "Trưởng phòng Kinh doanh",
        assigneeIds: ["u-mgr"],
        dueAt: null,
      },
    });
    const onSubmitted = vi.fn();
    renderWithProviders(<DemoSubmitButton onSubmitted={onSubmitted} />);

    await userEvent.click(await screen.findByRole("button", { name: /Tạo hồ sơ demo/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Trình duyệt" }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(api.submitDemo).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Hợp đồng dịch vụ xếp dỡ (demo)", amount: 300_000_000 }),
      expect.any(String),
    );
    expect(await screen.findByText(/đang chờ bước “Trưởng phòng Kinh doanh”/)).toBeInTheDocument();
  });
});

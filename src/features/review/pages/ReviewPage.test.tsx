import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { InstanceView } from "@/features/workflow";
import { meFixture } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

import { ReviewPage } from "./ReviewPage";

const api = vi.hoisted(() => ({
  fetchInstancesOfDocument: vi.fn(),
  actOnStep: vi.fn(),
}));
vi.mock("@/features/workflow/api/workflow", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchInstancesOfDocument: api.fetchInstancesOfDocument,
  actOnStep: api.actOnStep,
}));

const me = meFixture();

function instance(overrides: Partial<InstanceView> = {}): InstanceView {
  return {
    id: "inst-1",
    documentType: "CONTRACT",
    documentId: "c-1",
    document: {
      number: "HD-2026-0012",
      title: "HĐ xếp dỡ",
      customerName: "Cty Biển Xanh",
      amount: 1_200_000_000,
      currency: "VND",
    },
    status: "RUNNING",
    round: 1,
    definitionVersion: 3,
    submitter: { id: "u-sales", fullName: "Nguyễn Văn An" },
    submittedAt: "2026-11-10T02:00:00Z",
    completedAt: null,
    version: 4,
    steps: [
      {
        id: "s-1",
        order: 1,
        name: "Rà soát Kinh doanh",
        state: "CURRENT",
        decision: null,
        actedBy: null,
        completedAt: null,
        comment: null,
        assignees: [{ id: me.id, fullName: me.fullName }],
        startedAt: "2026-11-10T02:00:00Z",
        dueAt: null,
        overdue: false,
        assigneeHint: null,
        onReject: "BACK_TO_SUBMITTER",
      },
      {
        id: null,
        order: 2,
        name: "Pháp chế",
        state: "REMAINING",
        decision: null,
        actedBy: null,
        completedAt: null,
        comment: null,
        assignees: [],
        startedAt: null,
        dueAt: null,
        overdue: false,
        assigneeHint: "Chức danh LEGAL",
      },
    ],
    remainingSteps: 1,
    currentStepId: "s-1",
    canAct: true,
    history: [],
    ...overrides,
  };
}

function renderReview() {
  return renderWithProviders(<ReviewPage />, {
    route: "/review/CONTRACT/c-1",
    path: "/review/:documentType/:documentId",
  });
}

beforeEach(() => {
  api.fetchInstancesOfDocument.mockReset();
  api.actOnStep.mockReset();
});

describe("ReviewPage", () => {
  it("có nút duyệt khi canAct; từ chối bắt buộc nhận xét rồi mới gọi API", async () => {
    api.fetchInstancesOfDocument.mockResolvedValue([instance()]);
    api.actOnStep.mockResolvedValue({
      instanceId: "inst-1",
      status: "REVISION_REQUESTED",
      version: 5,
      completedStep: null,
      currentStep: null,
    });
    const user = userEvent.setup();
    renderReview();

    const task = (await screen.findByText("Việc của bạn")).closest(".ant-card") as HTMLElement;
    expect(within(task).getByRole("button", { name: "Duyệt" })).toBeInTheDocument();

    await user.click(within(task).getByRole("button", { name: "Từ chối" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/trả về/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Từ chối" }));
    expect(await within(dialog).findByText("Please enter a comment")).toBeInTheDocument();
    expect(api.actOnStep).not.toHaveBeenCalled();

    await user.type(within(dialog).getByRole("textbox"), "Sai giá trị hợp đồng");
    await user.click(within(dialog).getByRole("button", { name: "Từ chối" }));
    await waitFor(() =>
      expect(api.actOnStep).toHaveBeenCalledWith(
        expect.objectContaining({
          instanceId: "inst-1",
          stepId: "s-1",
          action: "REJECT",
          comment: "Sai giá trị hợp đồng",
          expectedVersion: 4,
        }),
        expect.any(String),
      ),
    );
  }, 20_000);

  it("không có nút khi không phải người duyệt; hiện trạng thái đang chờ", async () => {
    api.fetchInstancesOfDocument.mockResolvedValue([instance({ canAct: false })]);
    renderReview();
    expect(await screen.findByText(/Waiting at step 1\. Rà soát Kinh doanh/)).toBeInTheDocument();
    expect(screen.queryByText("Việc của bạn")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duyệt" })).not.toBeInTheDocument();
  });

  it("hồ sơ chưa gửi duyệt → 404", async () => {
    api.fetchInstancesOfDocument.mockResolvedValue([]);
    renderReview();
    expect(await screen.findByText("Document not found")).toBeInTheDocument();
  });

  it("yêu cầu sửa: người gửi thấy nhận xét và nút Sửa hồ sơ", async () => {
    api.fetchInstancesOfDocument.mockResolvedValue([
      instance({
        status: "REVISION_REQUESTED",
        canAct: false,
        submitter: { id: me.id, fullName: me.fullName },
        history: [
          {
            at: "2026-11-11T02:00:00Z",
            user: { id: "u-legal", fullName: "Hoàng Văn Em" },
            onBehalfOf: null,
            action: "REQUEST_REVISION",
            stepOrder: 2,
            stepName: "Pháp chế",
            round: 1,
            comment: "Bổ sung điều khoản phạt",
          },
        ],
      }),
    ]);
    renderReview();
    expect(await screen.findByText("Document needs revision")).toBeInTheDocument();
    expect(screen.getAllByText(/Bổ sung điều khoản phạt/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Sửa hồ sơ/ })).toBeInTheDocument();
  });
});

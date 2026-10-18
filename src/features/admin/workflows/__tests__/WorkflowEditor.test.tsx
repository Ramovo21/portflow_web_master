import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WorkflowDefinitionPage } from "@/features/admin";
import { renderWithProviders } from "@/test/render";
import { meFixture } from "@/test/fixtures";

import type { DefinitionResponse } from "../api/definitions";
import { definitionFixture } from "./fixtures";

const api = vi.hoisted(() => ({
  fetchDefinition: vi.fn(),
  fetchDefinitions: vi.fn(),
  updateDefinition: vi.fn(),
  validateDefinition: vi.fn(),
  activateDefinition: vi.fn(),
  cloneDefinition: vi.fn(),
  fetchRunningInstances: vi.fn(),
  fetchRoles: vi.fn(),
  fetchUsers: vi.fn(),
  lookupUsersByRole: vi.fn(),
  fetchDocumentTypes: vi.fn(),
  simulateDefinition: vi.fn(),
  createDefinition: vi.fn(),
}));
vi.mock("@/features/admin/workflows/api/definitions", () => api);

const admin = meFixture({ username: "admin", roles: ["ADMIN"], permissions: ["Workflow.Admin"] });

function setup(definition: DefinitionResponse, others: DefinitionResponse[] = []) {
  api.fetchDefinition.mockResolvedValue(definition);
  api.fetchDefinitions.mockResolvedValue([definition, ...others]);
  api.fetchRoles.mockResolvedValue([
    { code: "SALES_MANAGER", name: "TP KD", permissions: ["Workflow.Act"] },
    { code: "LEGAL", name: "Pháp chế", permissions: ["Workflow.Act"] },
  ]);
  api.fetchUsers.mockResolvedValue([]);
  api.lookupUsersByRole.mockResolvedValue([
    { id: "u1", username: "salesmgr", fullName: "Trần Thị Bình" },
  ]);
  api.fetchRunningInstances.mockResolvedValue(4);
  return renderWithProviders(<WorkflowDefinitionPage />, {
    me: admin,
    route: `/admin/workflows/${definition.id}`,
    path: "/admin/workflows/:id",
  });
}

beforeEach(() => vi.clearAllMocks());

describe("WorkflowEditor", { timeout: 30_000 }, () => {
  it("keeps data when switching Form ⇄ JSON in both directions", async () => {
    const user = userEvent.setup();
    setup(definitionFixture());
    expect(await screen.findByLabelText("Tên bước 1")).toHaveValue("Rà soát Kinh doanh");

    await user.click(screen.getByText("JSON"));
    const textarea = screen.getByLabelText("JSON định nghĩa") as HTMLTextAreaElement;
    expect(textarea.value).toContain('"name": "Pháp chế"');

    fireEvent.change(textarea, {
      target: { value: textarea.value.replace("Pháp chế", "Pháp chế mới") },
    });
    await user.click(screen.getByText("Form"));
    expect(screen.getByLabelText("Tên bước 2")).toHaveValue("Pháp chế mới");
    expect(screen.getByText("• chưa lưu")).toBeInTheDocument();
  });

  it("blocks returning to Form when JSON is broken", async () => {
    const user = userEvent.setup();
    setup(definitionFixture());
    await screen.findByLabelText("Tên bước 1");
    await user.click(screen.getByText("JSON"));
    const textarea = screen.getByLabelText("JSON định nghĩa");
    await user.type(textarea, "x");
    await user.click(screen.getByText("Form"));
    expect(screen.getByLabelText("JSON định nghĩa")).toBeInTheDocument();
    expect(screen.getAllByText(/Invalid JSON/).length).toBeGreaterThan(0);
  });

  it("reorders steps with ↑/↓ and renumbers order 1..n", async () => {
    const user = userEvent.setup();
    setup(definitionFixture());
    await screen.findByLabelText("Tên bước 1");
    await user.click(screen.getByRole("button", { name: "Đưa bước 2 lên" }));
    expect(screen.getByLabelText("Tên bước 1")).toHaveValue("Pháp chế");
    expect(screen.getByLabelText("Tên bước 2")).toHaveValue("Rà soát Kinh doanh");

    await user.click(screen.getByText("JSON"));
    const json = JSON.parse(
      (screen.getByLabelText("JSON định nghĩa") as HTMLTextAreaElement).value,
    );
    expect(
      json.steps.map((step: { order: number; name: string }) => [step.order, step.name]),
    ).toEqual([
      [1, "Pháp chế"],
      [2, "Rà soát Kinh doanh"],
    ]);
  });

  it("DRAFT has Lưu and Kích hoạt; saving sends renumbered content", async () => {
    const user = userEvent.setup();
    const draft = definitionFixture();
    setup(draft);
    api.updateDefinition.mockImplementation((_id: string, content) =>
      Promise.resolve({ ...draft, definition: content, warnings: [] }),
    );
    await screen.findByLabelText("Tên bước 1");
    expect(screen.getByRole("button", { name: "Kích hoạt…" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Tên bước 1"), {
      target: { value: "Rà soát Kinh doanh (sửa)" },
    });
    expect(screen.getByRole("button", { name: "Kích hoạt…" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(api.updateDefinition).toHaveBeenCalledTimes(1));
    expect(api.updateDefinition.mock.calls[0]![1].steps[0].name).toBe("Rà soát Kinh doanh (sửa)");
    await waitFor(() => expect(screen.queryByText("• chưa lưu")).not.toBeInTheDocument());
  });

  it("shows 422 WF_DEFINITION_INVALID errors on the matching step", async () => {
    const user = userEvent.setup();
    setup(definitionFixture());
    api.updateDefinition.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          errorCode: "WF_DEFINITION_INVALID",
          errors: [
            {
              field: "steps[1].assignee.value",
              code: "V3",
              message: "Role does not exist: LEGAL_X",
            },
          ],
        },
      },
    });
    await screen.findByLabelText("Tên bước 1");
    await user.type(screen.getByLabelText("Tên bước 1"), "!");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    const card = await screen.findByTestId("step-card-1");
    expect(await within(card).findByText(/V3: Role does not exist: LEGAL_X/)).toBeInTheDocument();
  });

  it("ACTIVE is read-only with a clone button", async () => {
    setup(definitionFixture({ status: "ACTIVE", activatedAt: "2026-10-26T04:00:00Z" }));
    expect(await screen.findByLabelText("Tên bước 1")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Lưu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kích hoạt…" })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Tạo bản nháp từ version này" }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Đưa bước/ })).not.toBeInTheDocument();
  });

  it("activation requires typing the document type code", async () => {
    const user = userEvent.setup();
    const active = definitionFixture({ id: "def-1", version: 1, status: "ACTIVE" });
    setup(definitionFixture(), [active]);
    api.validateDefinition.mockResolvedValue({ valid: true, violations: [] });
    api.activateDefinition.mockResolvedValue({
      definition: definitionFixture({ status: "ACTIVE" }),
      runningInstancesOnOldVersions: 4,
    });
    await screen.findByLabelText("Tên bước 1");
    await waitFor(() => expect(api.fetchDefinitions).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Kích hoạt…" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/4 hồ sơ đang chạy theo v1/)).toBeInTheDocument();
    const ok = within(dialog).getByRole("button", { name: "Kích hoạt" });
    expect(ok).toBeDisabled();
    await user.type(within(dialog).getByLabelText("Mã loại hồ sơ để xác nhận"), "CONTRAC");
    expect(ok).toBeDisabled();
    await user.type(within(dialog).getByLabelText("Mã loại hồ sơ để xác nhận"), "T");
    expect(ok).toBeEnabled();
    await user.click(ok);
    await waitFor(() =>
      expect(api.activateDefinition).toHaveBeenCalledWith("def-2", expect.any(String)),
    );
  });
});

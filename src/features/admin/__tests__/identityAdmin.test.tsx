import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { meFixture } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

import {
  createDepartment,
  fetchUsers,
  syncUsers,
  updateDocumentType,
  updateRole,
  type Department,
  type DocumentType,
  type Role,
  type UserRow,
} from "../api/identity";
import { resubmitOutbox, type IncompletePublication } from "../api/outbox";
import { keycloakUsersConsoleUrl } from "../lib/keycloak";
import { groupPermissionCatalog, listenerLabel, shortTypeName } from "../lib/labels";
import { parseRequirements } from "../lib/requirements";
import { DepartmentPage } from "../pages/DepartmentPage";
import { DocumentTypePage } from "../pages/DocumentTypePage";
import { OutboxPage } from "../pages/OutboxPage";
import { RolePage } from "../pages/RolePage";
import { UserManagementPage } from "../pages/UserManagementPage";

const KD = "0192f0a0-0000-7000-8000-000000000001";

const users: UserRow[] = [
  {
    id: "u-salesmgr",
    username: "salesmgr",
    fullName: "Trần Thị Bình",
    email: "binh.tt@abc.vn",
    departmentId: KD,
    departmentCode: "KD",
    departmentName: "Phòng Kinh doanh",
    active: true,
    sodViolation: false,
    syncedAt: "2026-10-16T02:00:00Z",
    syncSource: "JOB",
    lastSeenAt: null,
    roles: ["SALES_MANAGER"],
  },
  {
    id: "u-sod",
    username: "adm-x",
    fullName: "Quản Trị Kiêm Duyệt",
    email: null,
    departmentId: null,
    departmentCode: null,
    departmentName: null,
    active: true,
    sodViolation: true,
    syncedAt: "2026-10-16T02:00:00Z",
    syncSource: "JIT",
    lastSeenAt: "2026-10-16T02:00:00Z",
    roles: ["ADMIN", "DIRECTOR"],
  },
];

const departments: Department[] = [
  {
    id: KD,
    code: "KD",
    name: "Phòng Kinh doanh",
    headUserId: "u-salesmgr",
    parentId: null,
    version: 0,
  },
];

const roles: Role[] = [
  {
    code: "SALES",
    name: "Nhân viên Kinh doanh",
    permissions: ["Contract.Read", "Workflow.Act"],
    dataScope: "DEPARTMENT",
    system: true,
    version: 0,
  },
  {
    code: "AUDITOR",
    name: "Kiểm toán",
    permissions: [],
    dataScope: "DEPARTMENT",
    system: false,
    version: 0,
  },
];

const documentTypes: DocumentType[] = [
  {
    code: "ADDENDUM",
    name: "Phụ lục hợp đồng",
    requiresESign: false,
    workflowKey: "ADDENDUM",
    active: true,
    submitRequirements: {},
  },
];

const publications: IncompletePublication[] = [
  {
    id: "p1",
    listenerId: "PortFlow.Shared.Messaging.RabbitEventExternalizer",
    eventType: "PortFlow.Identity.Api.Events.UserProvisioned, PortFlow.Identity.Api",
    publishedAt: "2026-10-16T02:00:00Z",
    status: "FAILED",
    completionAttempts: 2,
    lastResubmittedAt: null,
  },
];

vi.mock("@/features/admin/api/identity", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchUsers: vi.fn(() => Promise.resolve(users)),
  syncUsers: vi.fn(() => Promise.resolve({ synced: 12, deactivated: 1 })),
  fetchDepartments: vi.fn(() => Promise.resolve(departments)),
  createDepartment: vi.fn((input: { code: string; name: string }) =>
    Promise.resolve({ id: "new", headUserId: null, parentId: null, version: 0, ...input }),
  ),
  updateDepartment: vi.fn(),
  fetchRoles: vi.fn(() => Promise.resolve(roles)),
  updateRole: vi.fn((code: string, input: object) =>
    Promise.resolve({ ...roles[1], ...input, code, version: 1 }),
  ),
  fetchPermissionCatalog: vi.fn(() =>
    Promise.resolve(["Contract.Read", "Workflow.Act", "Audit.Read", "System.Admin"]),
  ),
  fetchDocumentTypes: vi.fn(() => Promise.resolve(documentTypes)),
  updateDocumentType: vi.fn((code: string, input: object) =>
    Promise.resolve({ ...documentTypes[0], ...input, code }),
  ),
}));

vi.mock("@/features/admin/api/outbox", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchIncompletePublications: vi.fn(() => Promise.resolve(publications)),
  resubmitOutbox: vi.fn(() => Promise.resolve({ incompleteBefore: 1 })),
}));

const admin = meFixture({
  roles: ["ADMIN"],
  dataScope: "ALL",
  permissions: ["User.Admin", "Role.Admin", "DocumentType.Admin", "System.Admin"],
});

describe("admin helpers", () => {
  it("shortens .NET and Java event type names and labels the RabbitMQ externalizer", () => {
    expect(shortTypeName(publications[0]!.eventType)).toBe("UserProvisioned");
    expect(shortTypeName("com.portflow.identity.api.events.UserDeactivated")).toBe(
      "UserDeactivated",
    );
    expect(listenerLabel(publications[0]!.listenerId)).toBe("RabbitMQ");
    expect(
      listenerLabel(
        "org.springframework.modulith.events.support.DelegatingEventExternalizer.externalize(java.lang.Object)",
      ),
    ).toBe("RabbitMQ");
    expect(listenerLabel("PortFlow.Notification.Application.DocumentApprovedListener")).toBe(
      "DocumentApprovedListener",
    );
  });

  it("groups the permission catalog by resource in catalog order", () => {
    expect(groupPermissionCatalog(["Contract.Read", "Contract.Create", "Workflow.Act"])).toEqual([
      { resource: "Contract", codes: ["Contract.Read", "Contract.Create"] },
      { resource: "Workflow", codes: ["Workflow.Act"] },
    ]);
  });

  it("accepts only JSON objects as submit requirements", () => {
    expect(parseRequirements("")).toEqual({});
    expect(parseRequirements('{"attachments":["SIGNED_SCAN"]}')).toEqual({
      attachments: ["SIGNED_SCAN"],
    });
    expect(parseRequirements("[1]")).toBeUndefined();
    expect(parseRequirements("{oops")).toBeUndefined();
  });

  it("builds the Keycloak admin console link from the OIDC authority", () => {
    expect(keycloakUsersConsoleUrl("http://localhost:8180/realms/portflow", undefined)).toBe(
      "http://localhost:8180/admin/master/console/#/portflow/users",
    );
    expect(keycloakUsersConsoleUrl("http://kc/realms/portflow", "https://kc.example/admin")).toBe(
      "https://kc.example/admin",
    );
  });
});

describe("UserManagementPage", () => {
  it("shows the Keycloak mirror with roles, missing department and SoD warning", async () => {
    renderWithProviders(<UserManagementPage />, { me: admin });

    expect(await screen.findByText("Trần Thị Bình")).toBeInTheDocument();
    expect(screen.getByText("TP Kinh doanh")).toBeInTheDocument();
    expect(screen.getByText("Chưa gán phòng ban")).toBeInTheDocument();
    expect(screen.getByText("Vi phạm tách quyền")).toBeInTheDocument();
    expect(screen.getByText(/1 tài khoản vi phạm tách quyền/)).toBeInTheDocument();
    expect(screen.getByText("Chưa đăng nhập")).toBeInTheDocument();
  });

  it("filters inactive users and syncs from Keycloak", async () => {
    renderWithProviders(<UserManagementPage />, { me: admin });
    await screen.findByText("Trần Thị Bình");

    await userEvent.click(screen.getByText("Đã vô hiệu hóa"));
    await waitFor(() =>
      expect(fetchUsers).toHaveBeenLastCalledWith(expect.objectContaining({ active: false })),
    );

    await userEvent.click(screen.getByRole("button", { name: /Đồng bộ từ Keycloak/ }));
    expect(syncUsers).toHaveBeenCalled();
    expect(await screen.findByText(/Đã đồng bộ 12 người dùng/)).toBeInTheDocument();
  });
});

describe("DepartmentPage", () => {
  it("lists departments with the head's name and creates a new one", async () => {
    renderWithProviders(<DepartmentPage />, { me: admin });

    const row = (await screen.findByText("Phòng Kinh doanh")).closest("tr")!;
    expect(await within(row).findByText("Trần Thị Bình")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Thêm phòng ban/ }));
    const drawer = await screen.findByRole("dialog");
    await userEvent.type(within(drawer).getByLabelText("Mã phòng ban"), "kt 2");
    await userEvent.type(within(drawer).getByLabelText("Tên phòng ban"), "Phòng Khai thác 2");
    await userEvent.click(within(drawer).getByRole("button", { name: "Thêm" }));

    await waitFor(() =>
      expect(createDepartment).toHaveBeenCalledWith(
        { code: "KT2", name: "Phòng Khai thác 2", headUserId: null, parentId: null },
        expect.any(String),
      ),
    );
  });
});

describe("RolePage", () => {
  it("shows system roles read-only", async () => {
    renderWithProviders(<RolePage />, { me: admin });

    await userEvent.click(await screen.findByText("Nhân viên Kinh doanh"));
    expect(await screen.findByText("Vai trò hệ thống – chỉ xem")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lưu" })).not.toBeInTheDocument();
  });

  it("edits permissions and data scope of a custom role", async () => {
    renderWithProviders(<RolePage />, { me: admin });

    await userEvent.click(await screen.findByText("Kiểm toán"));
    const drawer = await screen.findByRole("dialog");
    // Danh mục: Contract.Read, Workflow.Act, Audit.Read… → "Read" đầu tiên là Contract.Read
    await userEvent.click((await within(drawer).findAllByRole("checkbox", { name: "Read" }))[0]!);
    await userEvent.click(within(drawer).getByLabelText("Toàn công ty"));
    await userEvent.click(within(drawer).getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(updateRole).toHaveBeenCalledWith("AUDITOR", {
        name: "Kiểm toán",
        dataScope: "ALL",
        permissions: ["Contract.Read"],
      }),
    );
  });
});

describe("DocumentTypePage", () => {
  it("validates and saves submit requirements as JSON", async () => {
    renderWithProviders(<DocumentTypePage />, { me: admin });

    await userEvent.click(await screen.findByText("Phụ lục hợp đồng"));
    const drawer = await screen.findByRole("dialog");
    const json = within(drawer).getByLabelText("Điều kiện khi gửi duyệt (JSON)");

    await userEvent.clear(json);
    await userEvent.paste("{oops");
    await userEvent.click(within(drawer).getByRole("button", { name: "Lưu" }));
    expect(await within(drawer).findByText(/JSON không hợp lệ/)).toBeInTheDocument();
    expect(updateDocumentType).not.toHaveBeenCalled();

    await userEvent.clear(json);
    await userEvent.paste('{"attachments":["SIGNED_SCAN"]}');
    await userEvent.click(within(drawer).getByLabelText("Cần ký số sau khi duyệt"));
    await userEvent.click(within(drawer).getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(updateDocumentType).toHaveBeenCalledWith("ADDENDUM", {
        name: "Phụ lục hợp đồng",
        workflowKey: "ADDENDUM",
        requiresESign: true,
        active: true,
        submitRequirements: { attachments: ["SIGNED_SCAN"] },
      }),
    );
  });
});

describe("OutboxPage", () => {
  it("lists incomplete publications and resubmits them with an idempotency key", async () => {
    renderWithProviders(<OutboxPage />, { me: admin });

    expect(await screen.findByText("UserProvisioned")).toBeInTheDocument();
    expect(screen.getByText("RabbitMQ")).toBeInTheDocument();
    expect(screen.getByText("Gửi lỗi")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Gửi lại tất cả/ }));
    await waitFor(() => expect(resubmitOutbox).toHaveBeenCalledWith(expect.any(String)));
    expect(await screen.findByText("Đã gửi lại 1 sự kiện chưa hoàn thành")).toBeInTheDocument();
  });
});

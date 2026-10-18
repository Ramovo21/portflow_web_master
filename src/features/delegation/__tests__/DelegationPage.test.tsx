import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";

import { meFixture } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

import { delegationState, revokeDelegation, type Delegation } from "../api/delegations";
import { DelegationPage } from "../pages/DelegationPage";

const ME = "0192f0a1-0000-7000-8000-000000000002";
const day = (offset: number) => dayjs().add(offset, "day").format("YYYY-MM-DD");

const rows: Delegation[] = [
  {
    id: "d1",
    fromUserId: ME,
    fromUserName: "Trần Thị Bình",
    toUserId: "u-legal",
    toUserName: "Hoàng Văn Em",
    documentTypes: ["CONTRACT"],
    validFrom: day(0),
    validTo: day(3),
    reason: "Nghỉ phép",
    revoked: false,
  },
  {
    id: "d2",
    fromUserId: "u-director",
    fromUserName: "Võ Thị Giang",
    toUserId: ME,
    toUserName: "Trần Thị Bình",
    documentTypes: [],
    validFrom: day(5),
    validTo: day(7),
    reason: "Công tác",
    revoked: false,
  },
  {
    id: "d3",
    fromUserId: ME,
    fromUserName: "Trần Thị Bình",
    toUserId: "u-sales",
    toUserName: "Nguyễn Văn An",
    documentTypes: [],
    validFrom: day(-10),
    validTo: day(-5),
    reason: "Cũ",
    revoked: false,
  },
];

vi.mock("@/features/delegation/api/delegations", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchDelegations: vi.fn(() => Promise.resolve(rows)),
  revokeDelegation: vi.fn(() => Promise.resolve({ ...rows[0], revoked: true })),
  searchApprovers: vi.fn(() => Promise.resolve([])),
}));

const manager = meFixture({ permissions: ["Workflow.Act", "Delegation.Manage"] });

describe("delegationState", () => {
  it("derives the state from dates and revocation", () => {
    const base = { revoked: false, validFrom: "2026-10-10", validTo: "2026-10-20" };
    expect(delegationState(base, "2026-10-09")).toBe("UPCOMING");
    expect(delegationState(base, "2026-10-10")).toBe("ACTIVE");
    expect(delegationState(base, "2026-10-20")).toBe("ACTIVE");
    expect(delegationState(base, "2026-10-21")).toBe("EXPIRED");
    expect(delegationState({ ...base, revoked: true }, "2026-10-15")).toBe("REVOKED");
  });
});

describe("DelegationPage", () => {
  it("lists current delegations with names, types and state; expired ones only under 'Tất cả'", async () => {
    renderWithProviders(<DelegationPage />, { me: manager });

    expect(await screen.findByText("Hoàng Văn Em")).toBeInTheDocument();
    expect(screen.getByText("Võ Thị Giang")).toBeInTheDocument();
    expect(screen.getByText("Hợp đồng")).toBeInTheDocument();
    expect(screen.getByText("Đang hiệu lực")).toBeInTheDocument();
    expect(screen.getByText("Sắp hiệu lực")).toBeInTheDocument();
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Tất cả"));
    expect(await screen.findByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getByText("Hết hạn")).toBeInTheDocument();
  });

  it("lets the delegator revoke only their own current delegation", async () => {
    renderWithProviders(<DelegationPage />, { me: manager });

    await screen.findByText("Hoàng Văn Em");
    const buttons = screen.getAllByRole("button", { name: /Thu hồi ủy quyền/ });
    expect(buttons).toHaveLength(1);

    await userEvent.click(buttons[0]!);
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Thu hồi" }));
    expect(revokeDelegation).toHaveBeenCalledWith("d1", expect.any(String));
  });

  it("opens the create form", async () => {
    renderWithProviders(<DelegationPage />, { me: manager });

    await userEvent.click(screen.getByRole("button", { name: /Tạo ủy quyền/ }));
    expect(await screen.findByText("Tạo ủy quyền duyệt")).toBeInTheDocument();
    expect(screen.getByText("Người nhận ủy quyền")).toBeInTheDocument();
    expect(screen.queryByText("Người ủy quyền", { selector: "label" })).not.toBeInTheDocument();
  });
});

import type { Me } from "@/features/auth";

export function meFixture(overrides: Partial<Me> = {}): Me {
  return {
    id: "0192f0a1-0000-7000-8000-000000000002",
    username: "salesmgr",
    fullName: "Trần Thị Bình",
    department: {
      id: "0192f0a0-0000-7000-8000-000000000001",
      code: "KD",
      name: "Phòng Kinh doanh",
    },
    roles: ["SALES_MANAGER"],
    dataScope: "DEPARTMENT",
    permissions: [
      "Customer.Read",
      "Contract.Read",
      "Contract.Create",
      "PriceList.Read",
      "Workflow.Act",
    ],
    actingFor: [],
    ...overrides,
  };
}

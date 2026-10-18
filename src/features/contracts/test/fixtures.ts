import dayjs from "dayjs";

import type { ContractListItem, ContractResponse } from "../api/contracts";

export const CONTRACT_ID = "0192f0c1-0000-7000-8000-000000000001";
export const CUSTOMER_ID = "0192f0b0-0000-7000-8000-000000000001";

export function contractFixture(overrides: Partial<ContractResponse> = {}): ContractResponse {
  return {
    id: CONTRACT_ID,
    number: "HD-2026-0012",
    customerId: CUSTOMER_ID,
    customerName: "Công ty TNHH Vận tải Biển Xanh",
    customerStatus: "ACTIVE",
    title: "HĐ dịch vụ xếp dỡ container 2027",
    effectiveFrom: "2027-01-01",
    effectiveTo: "2027-12-31",
    value: { amount: 3600000000, currency: "VND" },
    paymentTerms: { paymentDays: 30, method: "BANK_TRANSFER", note: null },
    serviceTerms: "Xếp dỡ container tại cảng",
    services: [
      { serviceCode: "CONT20_HANDLING", mandatory: true, validFrom: null, sourceAddendumId: null },
    ],
    status: "DRAFT",
    revision: 0,
    requiresESign: true,
    signingState: "NOT_REQUIRED",
    supersedesContractId: null,
    ownerDepartmentId: "0192f0a0-0000-7000-8000-000000000001",
    submitterId: null,
    approvedAt: null,
    activatedAt: null,
    cancelReason: null,
    version: 3,
    createdAt: "2026-10-10T02:00:00Z",
    updatedAt: "2026-10-10T02:00:00Z",
    allowedActions: ["UPDATE", "UPLOAD_ATTACHMENT", "SUBMIT", "DELETE"],
    workflow: null,
    currentTerms: null,
    attachments: [],
    ...overrides,
  };
}

export function contractEndingIn(daysToEnd: number): ContractResponse {
  const end = dayjs().add(daysToEnd, "day").format("YYYY-MM-DD");
  return contractFixture({
    status: daysToEnd < 0 ? "EXPIRED" : "ACTIVE",
    effectiveFrom: dayjs().subtract(200, "day").format("YYYY-MM-DD"),
    effectiveTo: end,
    approvedAt: "2026-01-01T00:00:00Z",
    allowedActions: ["CREATE_ADDENDUM"],
  });
}

export function listItemFixture(overrides: Partial<ContractListItem> = {}): ContractListItem {
  const contract = contractFixture({ status: "UNDER_REVIEW", revision: 1 });
  return {
    contract: {
      id: contract.id,
      number: contract.number,
      customerId: contract.customerId,
      title: contract.title,
      status: contract.status,
      effectiveFrom: contract.effectiveFrom,
      effectiveTo: contract.effectiveTo,
      value: contract.value.amount,
      currency: "VND",
      ownerDepartmentId: contract.ownerDepartmentId,
      requiresESign: true,
      signingState: "NOT_REQUIRED",
    },
    customerName: contract.customerName,
    revision: 1,
    updatedAt: contract.updatedAt,
    workflow: {
      instanceId: "i-1",
      workflowStatus: "RUNNING",
      round: 1,
      order: 2,
      name: "Pháp chế",
      assignees: [{ id: "u-legal", fullName: "Hoàng Văn Em" }],
      totalSteps: 3,
      doneSteps: 1,
    },
    ...overrides,
  };
}

import type { DefinitionContent, DefinitionResponse } from "../api/definitions";

export function contentFixture(): DefinitionContent {
  return {
    documentType: "CONTRACT",
    resubmitPolicy: "RESTART",
    steps: [
      {
        order: 1,
        name: "Rà soát Kinh doanh",
        assignee: {
          type: "ROLE",
          value: "SALES_MANAGER",
          scope: "SAME_DEPARTMENT_AS_SUBMITTER",
          userIds: [],
        },
        onReject: "BACK_TO_SUBMITTER",
        condition: null,
        slaHours: 24,
        requiresAllApprovers: false,
      },
      {
        order: 2,
        name: "Pháp chế",
        assignee: { type: "ROLE", value: "LEGAL", scope: "ANY", userIds: [] },
        onReject: "TERMINATE",
        condition: "amount > 500000000",
        slaHours: 48,
        requiresAllApprovers: false,
      },
    ],
    onFinalApprove: { emitESign: true },
  };
}

export function definitionFixture(overrides: Partial<DefinitionResponse> = {}): DefinitionResponse {
  return {
    id: "def-2",
    documentType: "CONTRACT",
    version: 2,
    status: "DRAFT",
    effectiveFrom: null,
    definition: contentFixture(),
    activatedAt: null,
    createdAt: "2026-10-26T02:00:00Z",
    updatedAt: "2026-10-26T03:00:00Z",
    warnings: [],
    ...overrides,
  };
}

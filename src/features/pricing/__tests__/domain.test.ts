import { meFixture } from "@/test/fixtures";

import type { PriceListDetail, PriceListRow } from "../api/priceLists";
import {
  expectedApprovalSteps,
  latestPerChain,
  maxDecreasePct,
  minNewVersionDate,
  priceListActions,
} from "../domain";
import { lineProblems, parseMoneyInput, toLineInputs } from "../lines";

const ME = meFixture({ permissions: ["PriceList.Read", "PriceList.Create", "PriceList.Submit"] });

function detail(overrides: Partial<PriceListDetail> = {}): PriceListDetail {
  return {
    id: "p1",
    code: "BG-2026-000001",
    scope: "CUSTOMER",
    scopeId: "c1",
    serviceType: "STORAGE",
    name: "Giá",
    listVersion: 1,
    revisionNumber: 0,
    currency: "VND",
    status: "DRAFT",
    validFrom: "2026-10-01",
    validTo: null,
    usedInBilling: false,
    billedThrough: null,
    previousVersionId: null,
    supersededById: null,
    sourceAddendumId: null,
    ownerDepartmentId: ME.department!.id,
    note: null,
    version: 0,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: null,
    lines: [],
    workflow: null,
    ...overrides,
  };
}

const has = (permission: string) => ME.permissions.includes(permission);

describe("priceListActions", () => {
  it("derives actions from status, ownership and permissions when backend sends none", () => {
    expect([...priceListActions(detail(), ME, has)].sort()).toEqual(["CANCEL", "SUBMIT", "UPDATE"]);
    expect([...priceListActions(detail({ status: "REJECTED" }), ME, has)]).toEqual(["REVISE"]);
    expect([...priceListActions(detail({ status: "EFFECTIVE" }), ME, has)]).toEqual([
      "NEW_VERSION",
    ]);
    expect(
      priceListActions(detail({ status: "EFFECTIVE", supersededById: "p2" }), ME, has).size,
    ).toBe(0);
    expect(priceListActions(detail({ usedInBilling: true }), ME, has).has("UPDATE")).toBe(false);
    expect(priceListActions(detail({ ownerDepartmentId: "other" }), ME, has).size).toBe(0);
  });

  it("cannot cancel a draft that was already submitted once", () => {
    const resubmittable = detail({
      revisionNumber: 1,
      workflow: {
        instanceId: "w",
        status: "REVISION_REQUESTED",
        round: 1,
        currentStepOrder: null,
        currentStepName: null,
        currentAssignees: [],
        totalSteps: 2,
        doneSteps: 0,
      },
    });
    expect(priceListActions(resubmittable, ME, has).has("CANCEL")).toBe(false);
  });

  it("prefers backend allowedActions when present", () => {
    expect([...priceListActions(detail({ allowedActions: ["SUBMIT"] }), ME, has)]).toEqual([
      "SUBMIT",
    ]);
  });
});

describe("approval preview helpers", () => {
  it("computes max decrease against previous version", () => {
    const previous = [
      { serviceCode: "A", unitPrice: 100000 },
      { serviceCode: "B", unitPrice: 250000 },
    ];
    expect(
      maxDecreasePct(
        [
          { serviceCode: "A", unitPrice: 85000 },
          { serviceCode: "B", unitPrice: 260000 },
        ],
        previous,
      ),
    ).toBe(15);
    expect(maxDecreasePct([{ serviceCode: "A", unitPrice: 85000 }], undefined)).toBe(0);
    expect(expectedApprovalSteps("CUSTOMER", 15)).toEqual(["TP Kinh doanh", "Ban Giám đốc"]);
    expect(expectedApprovalSteps("CUSTOMER", 5)).toEqual(["TP Kinh doanh"]);
    expect(expectedApprovalSteps("GLOBAL", 0)).toHaveLength(2);
  });

  it("new version must start after current start and after billedThrough", () => {
    expect(
      minNewVersionDate({ validFrom: "2026-03-01", billedThrough: null }).format("YYYY-MM-DD"),
    ).toBe("2026-03-02");
    expect(
      minNewVersionDate({ validFrom: "2026-03-01", billedThrough: "2026-10-31" }).format(
        "YYYY-MM-DD",
      ),
    ).toBe("2026-11-01");
  });
});

describe("list grouping and line helpers", () => {
  it("keeps only the latest version of each chain", () => {
    const row = (id: string, scopeId: string, listVersion: number) =>
      ({ id, scope: "CUSTOMER", scopeId, serviceType: "STORAGE", listVersion }) as PriceListRow;
    expect(
      latestPerChain([row("a", "c1", 1), row("b", "c1", 2), row("c", "c2", 1)]).map((r) => r.id),
    ).toEqual(["b", "c"]);
  });

  it("validates lines and takes UoM from catalog", () => {
    expect(lineProblems([{ key: "1" }])).toContain("Có dòng chưa chọn dịch vụ.");
    expect(lineProblems([{ key: "1", serviceCode: "A", unitPrice: null }])).toContain(
      "Dịch vụ A chưa có đơn giá.",
    );
    expect(lineProblems([{ key: "1", serviceCode: "A", unitPrice: 0 }])).toEqual([]);
    const inputs = toLineInputs(
      [{ key: "1", serviceCode: "A", unitPrice: 5, minQty: 0 }],
      [
        {
          id: "s",
          code: "A",
          name: "A",
          groupCode: "G",
          uom: "TRIP",
          defaultTaxRate: 0,
          mandatoryDefault: false,
          active: true,
        },
      ],
    );
    expect(inputs[0].uom).toBe("TRIP");
    expect(parseMoneyInput("1.200.000,5")).toBe(1200000.5);
    expect(parseMoneyInput("")).toBeUndefined();
  });
});

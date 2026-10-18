import { addendumEligibility } from "./addendumEligibility";
import { contractSchema } from "./contractSchema";
import { diffPathLabel, diffValue } from "./diffLabels";
import { isReady, readinessItems } from "./readiness";
import { addendumSummary, deltaPct, toChanges } from "./addendumPayload";

describe("addendumEligibility (CTR-X1)", () => {
  it.each([
    ["ACTIVE", 90, true],
    ["ACTIVE", 91, false],
    ["EXPIRED", -30, true],
    ["EXPIRED", -31, false],
  ] as const)("EXTENSION %s, còn %i ngày → %s", (status, days, allowed) => {
    expect(addendumEligibility("EXTENSION", status, days).allowed).toBe(allowed);
  });

  it("loại khác chỉ khi APPROVED / ACTIVE", () => {
    expect(addendumEligibility("PRICE_CHANGE", "APPROVED", 300).allowed).toBe(true);
    expect(addendumEligibility("PRICE_CHANGE", "DRAFT", 300)).toEqual({
      allowed: false,
      reason: "Only when the contract is approved or active",
    });
    expect(addendumEligibility("EXTENSION", "DRAFT", 10).allowed).toBe(false);
  });
});

describe("contractSchema", () => {
  const valid = {
    customerId: "c",
    title: "HĐ",
    effectiveFrom: "2027-01-01",
    effectiveTo: "2027-12-31",
    amount: 1000.5,
    currency: "VND" as const,
    paymentDays: 30,
    paymentMethod: "BANK_TRANSFER",
    services: [],
  };

  it("chấp nhận dữ liệu hợp lệ", () => {
    expect(contractSchema.safeParse(valid).success).toBe(true);
  });

  it("ngày bắt đầu sau ngày kết thúc → lỗi ở effectiveTo (CTR-02)", () => {
    const result = contractSchema.safeParse({ ...valid, effectiveFrom: "2028-01-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["effectiveTo"]);
  });

  it("tiền tối đa 2 số lẻ, số ngày 0..365", () => {
    expect(contractSchema.safeParse({ ...valid, amount: 1.234 }).success).toBe(false);
    expect(contractSchema.safeParse({ ...valid, paymentDays: 366 }).success).toBe(false);
    expect(contractSchema.safeParse({ ...valid, customerId: "" }).success).toBe(false);
  });
});

describe("readiness (CTR-02)", () => {
  const base = {
    customerActive: true,
    datesValid: true,
    serviceCount: 1,
    attachmentCount: 0,
    serviceTerms: "x",
  };
  it("đủ điều kiện khi có điều khoản dịch vụ thay cho tệp", () => {
    expect(isReady(readinessItems(base))).toBe(true);
  });
  it("thiếu dịch vụ hoặc thiếu cả tệp lẫn điều khoản → chưa sẵn sàng", () => {
    expect(isReady(readinessItems({ ...base, serviceCount: 0 }))).toBe(false);
    expect(isReady(readinessItems({ ...base, serviceTerms: " " }))).toBe(false);
    expect(isReady(readinessItems({ ...base, customerActive: false }))).toBe(false);
  });
});

describe("diff labels (FR-K06)", () => {
  it("dịch path sang nhãn tiếng Việt", () => {
    expect(diffPathLabel("paymentTerms.paymentDays")).toBe("Điều khoản thanh toán › Số ngày");
    expect(diffPathLabel("services[STO-CONT-DAY].mandatory")).toBe(
      "Dịch vụ STO-CONT-DAY › Bắt buộc",
    );
    expect(diffPathLabel("lạ.lắm")).toBe("lạ.lắm");
    expect(diffValue("services[X].mandatory", true)).toBe("Có");
  });
});

describe("addendum payload", () => {
  it("đổi giá chỉ gửi dòng đã nhập", () => {
    expect(
      toChanges(
        {
          type: "PRICE_CHANGE",
          effectiveFrom: "2027-01-01",
          prices: { A: 80000, B: undefined, C: null },
        },
        "VND",
      ),
    ).toEqual({ lines: [{ serviceCode: "A", unitPrice: 80000, currency: "VND" }] });
  });
  it("tóm tắt và chênh lệch %", () => {
    expect(addendumSummary("EXTENSION", { newEffectiveTo: "2028-12-31" })).toBe(
      "Gia hạn đến 31/12/2028",
    );
    expect(deltaPct(100000, 85000)).toBe(-15);
    expect(deltaPct(undefined, 1)).toBeUndefined();
  });
});

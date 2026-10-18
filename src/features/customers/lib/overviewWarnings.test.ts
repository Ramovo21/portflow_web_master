import { warningText } from "./overviewWarnings";

const base = {
  documentType: "CONTRACT",
  documentId: "k-1",
  reference: "HD-2026-0001",
  dueDate: "2026-11-02",
};

describe("warningText", () => {
  it("diễn đạt cảnh báo hợp đồng sắp hết hạn", () => {
    expect(warningText({ ...base, code: "CONTRACT_EXPIRING", daysLeft: 20 })).toBe(
      "Hợp đồng HD-2026-0001 sắp hết hạn – còn 20 ngày (02/11/2026)",
    );
  });

  it("diễn đạt bảng giá hết hiệu lực hôm nay", () => {
    expect(
      warningText({
        ...base,
        documentType: "PRICE_LIST",
        reference: "BG-1",
        code: "PRICE_LIST_EXPIRING",
        daysLeft: 0,
      }),
    ).toBe("Bảng giá BG-1 sắp hết hiệu lực – hết hạn hôm nay (02/11/2026)");
  });
});

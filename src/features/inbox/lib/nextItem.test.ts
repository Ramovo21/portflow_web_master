import { nextInQueue, removeFromQueue, saveQueue } from "./nextItem";

describe("hàng đợi hồ sơ kế tiếp", () => {
  beforeEach(() => sessionStorage.clear());

  it("trả hồ sơ sau hồ sơ hiện tại và bỏ hồ sơ đã xử lý", () => {
    saveQueue([
      { documentType: "CONTRACT", documentId: "a" },
      { documentType: "PRICE_LIST", documentId: "b" },
      { documentType: "CONTRACT", documentId: "c" },
    ]);
    expect(nextInQueue({ documentType: "CONTRACT", documentId: "a" })).toEqual({
      documentType: "PRICE_LIST",
      documentId: "b",
    });
    removeFromQueue({ documentType: "PRICE_LIST", documentId: "b" });
    expect(nextInQueue({ documentType: "CONTRACT", documentId: "a" })).toEqual({
      documentType: "CONTRACT",
      documentId: "c",
    });
    expect(nextInQueue({ documentType: "CONTRACT", documentId: "c" })).toBeUndefined();
  });
});

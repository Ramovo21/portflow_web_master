import dayjs from "dayjs";

import { slaInfo } from "./sla";

const NOW = dayjs("2026-11-12T02:00:00Z");

describe("slaInfo (03 §3.3)", () => {
  it("không hạn", () => {
    expect(slaInfo(null, null, NOW)).toMatchObject({ tone: "none", text: "Không hạn" });
  });

  it("quá hạn", () => {
    expect(slaInfo("2026-11-11T21:00:00Z", null, NOW)).toMatchObject({
      tone: "overdue",
      text: "Quá hạn 5 giờ",
    });
  });

  it("còn dưới 24 giờ", () => {
    expect(slaInfo("2026-11-12T05:00:00Z", null, NOW)).toMatchObject({
      tone: "soon",
      text: "Còn 3 giờ",
    });
  });

  it("còn từ 24 giờ", () => {
    expect(slaInfo("2026-11-13T06:00:00Z", null, NOW)).toMatchObject({
      tone: "normal",
      text: "Còn 1 ngày 4 giờ",
    });
  });
});

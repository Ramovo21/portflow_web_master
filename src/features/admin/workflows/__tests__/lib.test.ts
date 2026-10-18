import { diffDefinitions } from "../lib/diffDefinitions";
import { missingVariables } from "../lib/conditionVariables";
import { moveStep, normalizeContent, parseJson, removeStep, toJson } from "../lib/steps";
import { groupByStep, parseViolationPath } from "../lib/violationPath";
import { contentFixture } from "./fixtures";

describe("steps", () => {
  it("moves a step and renumbers order 1..n", () => {
    const moved = moveStep(contentFixture().steps, 1, -1);
    expect(moved.map((step) => [step.order, step.name])).toEqual([
      [1, "Pháp chế"],
      [2, "Rà soát Kinh doanh"],
    ]);
    expect(moveStep(contentFixture().steps, 0, -1)).toEqual(contentFixture().steps);
  });

  it("removes a step and renumbers", () => {
    expect(removeStep(contentFixture().steps, 0).map((step) => step.order)).toEqual([1]);
  });

  it("round-trips JSON and normalizes missing fields", () => {
    const content = contentFixture();
    const parsed = parseJson(toJson(content));
    expect(parsed).toEqual({ ok: true, content });
    expect(normalizeContent({ documentType: "X", steps: [{ name: "A" }] }).steps[0]).toMatchObject({
      order: 1,
      assignee: { type: "ROLE", scope: "ANY", userIds: [] },
      onReject: "TERMINATE",
      requiresAllApprovers: false,
    });
    expect(parseJson("{ broken").ok).toBe(false);
    expect(parseJson("[]").ok).toBe(false);
  });
});

describe("diffDefinitions", () => {
  it("lists added, removed and changed steps and settings", () => {
    const before = contentFixture();
    const after = contentFixture();
    after.steps[1]!.slaHours = 24;
    after.steps[1]!.condition = null;
    after.steps.push({ ...after.steps[0]!, order: 3, name: "Ban Giám đốc" });
    after.resubmitPolicy = "RESUME_AT_REQUESTER";
    const texts = diffDefinitions(before, after).map((change) => `${change.kind}:${change.text}`);
    expect(texts).toEqual([
      expect.stringContaining("changed:Gửi lại"),
      expect.stringMatching(
        /changed:Bước ② Pháp chế: điều kiện amount > 500000000 → \(không\); hạn 48h → 24h/,
      ),
      "added:Thêm bước ③ Ban Giám đốc",
    ]);
    expect(diffDefinitions(after, before).some((change) => change.kind === "removed")).toBe(true);
  });
});

describe("violation paths", () => {
  it("maps paths to steps", () => {
    expect(parseViolationPath("steps[1].assignee.value")).toEqual({
      stepIndex: 1,
      field: "assignee.value",
    });
    expect(parseViolationPath("steps[0].assignee.userIds[2]")).toEqual({
      stepIndex: 0,
      field: "assignee.userIds[2]",
    });
    expect(parseViolationPath("documentType")).toEqual({ stepIndex: null, field: "documentType" });
    const groups = groupByStep([
      { rule: "V3", path: "steps[1].assignee.value", message: "x", severity: "ERROR" },
      { rule: "V7", path: "documentType", message: "y", severity: "ERROR" },
    ]);
    expect([...groups.keys()]).toEqual([-1, 1]);
  });

  it("warns when a condition uses a variable the document type does not provide", () => {
    expect(missingVariables("maxDeltaPct > 10 or amount > 1", "CONTRACT")).toEqual(["maxDeltaPct"]);
    expect(missingVariables("amount > 1", "CONTRACT")).toEqual([]);
  });
});

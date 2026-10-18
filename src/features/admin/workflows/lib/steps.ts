import type { DefinitionContent, StepDefinition } from "../api/definitions";

export const MAX_STEPS = 15;

export function renumber(steps: StepDefinition[]): StepDefinition[] {
  return steps.map((step, index) => ({ ...step, order: index + 1 }));
}

export function moveStep(steps: StepDefinition[], index: number, delta: -1 | 1): StepDefinition[] {
  const target = index + delta;
  if (target < 0 || target >= steps.length) return steps;
  const next = [...steps];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return renumber(next);
}

export function removeStep(steps: StepDefinition[], index: number): StepDefinition[] {
  return renumber(steps.filter((_, i) => i !== index));
}

export function duplicateStep(steps: StepDefinition[], index: number): StepDefinition[] {
  const copy = structuredClone(steps[index]!);
  copy.name = `${copy.name} (bản sao)`;
  return renumber([...steps.slice(0, index + 1), copy, ...steps.slice(index + 1)]);
}

export function newStep(order: number): StepDefinition {
  return {
    order,
    name: `Bước ${order}`,
    assignee: { type: "ROLE", value: null, scope: "ANY", userIds: [] },
    onReject: "TERMINATE",
    condition: null,
    slaHours: 48,
    requiresAllApprovers: false,
  };
}

export function templateDefinition(documentType: string): DefinitionContent {
  return {
    documentType,
    resubmitPolicy: "RESTART",
    steps: [
      {
        ...newStep(1),
        name: "Trưởng phòng duyệt",
        assignee: {
          type: "DYNAMIC",
          value: "submitter.department.head",
          scope: "ANY",
          userIds: [],
        },
      },
    ],
    onFinalApprove: { emitESign: false },
  };
}

export function normalizeContent(raw: unknown): DefinitionContent {
  const value = (raw ?? {}) as Partial<DefinitionContent>;
  const steps = Array.isArray(value.steps) ? value.steps : [];
  return {
    documentType: String(value.documentType ?? ""),
    resubmitPolicy:
      value.resubmitPolicy === "RESUME_AT_REQUESTER" ? "RESUME_AT_REQUESTER" : "RESTART",
    onFinalApprove: { emitESign: Boolean(value.onFinalApprove?.emitESign) },
    steps: steps.map((step, index) => ({
      order: typeof step?.order === "number" ? step.order : index + 1,
      name: step?.name ?? "",
      assignee: {
        type: step?.assignee?.type ?? "ROLE",
        value: step?.assignee?.value ?? null,
        scope:
          step?.assignee?.scope === "SAME_DEPARTMENT_AS_SUBMITTER"
            ? "SAME_DEPARTMENT_AS_SUBMITTER"
            : "ANY",
        userIds: Array.isArray(step?.assignee?.userIds) ? step.assignee.userIds : [],
      },
      onReject: step?.onReject === "BACK_TO_SUBMITTER" ? "BACK_TO_SUBMITTER" : "TERMINATE",
      condition: step?.condition ? String(step.condition) : null,
      slaHours: typeof step?.slaHours === "number" ? step.slaHours : null,
      requiresAllApprovers: Boolean(step?.requiresAllApprovers),
    })),
  };
}

export function toJson(content: DefinitionContent): string {
  return JSON.stringify(content, null, 2);
}

export function parseJson(
  text: string,
): { ok: true; content: DefinitionContent } | { ok: false; error: string } {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "JSON must be a workflow definition object." };
    }
    return { ok: true, content: normalizeContent(parsed) };
  } catch (error) {
    return { ok: false, error: `Invalid JSON: ${(error as Error).message}` };
  }
}

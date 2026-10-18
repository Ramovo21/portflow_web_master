import type { ProblemFieldError } from "@/shared/lib/problem";

import type { Violation } from "../api/definitions";

export function parseViolationPath(path: string | null | undefined): {
  stepIndex: number | null;
  field: string;
} {
  if (!path) return { stepIndex: null, field: "" };
  const match = /^steps\[(\d+)\](?:\.(.*))?$/.exec(path);
  if (!match) return { stepIndex: null, field: path };
  return { stepIndex: Number(match[1]), field: match[2] ?? "" };
}

export function violationsFromProblem(errors: ProblemFieldError[]): Violation[] {
  return errors.map((error) => ({
    rule: error.code ?? "V?",
    path: error.field ?? null,
    message: error.message ?? "",
    severity: "ERROR",
  }));
}

export function groupByStep(violations: Violation[]): Map<number, Violation[]> {
  const groups = new Map<number, Violation[]>();
  for (const violation of violations) {
    const { stepIndex } = parseViolationPath(violation.path);
    const key = stepIndex ?? -1;
    groups.set(key, [...(groups.get(key) ?? []), violation]);
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a - b));
}

export function violationsOfStep(violations: Violation[], stepIndex: number): Violation[] {
  return violations.filter(
    (violation) => parseViolationPath(violation.path).stepIndex === stepIndex,
  );
}

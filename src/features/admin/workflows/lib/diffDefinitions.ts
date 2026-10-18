import type { DefinitionContent, StepDefinition } from "../api/definitions";
import { assigneeShortLabel, circled, ON_REJECT_LABELS, RESUBMIT_LABELS } from "./labels";

export interface DefinitionChange {
  kind: "added" | "removed" | "changed";
  text: string;
}

function fieldChanges(before: StepDefinition, after: StepDefinition): string[] {
  const changes: string[] = [];
  if (before.name !== after.name) changes.push(`tên "${before.name}" → "${after.name}"`);
  const assigneeBefore = assigneeShortLabel(before.assignee);
  const assigneeAfter = assigneeShortLabel(after.assignee);
  if (JSON.stringify(before.assignee) !== JSON.stringify(after.assignee)) {
    changes.push(`người duyệt ${assigneeBefore} → ${assigneeAfter}`);
  }
  if ((before.condition ?? "") !== (after.condition ?? "")) {
    changes.push(`điều kiện ${before.condition ?? "(không)"} → ${after.condition ?? "(không)"}`);
  }
  if (before.onReject !== after.onReject) {
    changes.push(
      `khi từ chối ${ON_REJECT_LABELS[before.onReject]} → ${ON_REJECT_LABELS[after.onReject]}`,
    );
  }
  if (before.slaHours !== after.slaHours) {
    changes.push(
      `hạn ${before.slaHours ?? "không"}${before.slaHours ? "h" : ""} → ${after.slaHours ?? "không"}${after.slaHours ? "h" : ""}`,
    );
  }
  if (before.requiresAllApprovers !== after.requiresAllApprovers) {
    changes.push(
      after.requiresAllApprovers ? "chuyển sang tất cả phải duyệt" : "chuyển sang bất kỳ 1 người",
    );
  }
  return changes;
}

export function diffDefinitions(
  before: DefinitionContent,
  after: DefinitionContent,
): DefinitionChange[] {
  const changes: DefinitionChange[] = [];
  if (before.resubmitPolicy !== after.resubmitPolicy) {
    changes.push({
      kind: "changed",
      text: `Gửi lại: ${RESUBMIT_LABELS[before.resubmitPolicy]} → ${RESUBMIT_LABELS[after.resubmitPolicy]}`,
    });
  }
  if (before.onFinalApprove.emitESign !== after.onFinalApprove.emitESign) {
    changes.push({
      kind: "changed",
      text: after.onFinalApprove.emitESign
        ? "Bật yêu cầu ký điện tử khi duyệt xong"
        : "Tắt yêu cầu ký điện tử",
    });
  }
  const max = Math.max(before.steps.length, after.steps.length);
  for (let index = 0; index < max; index++) {
    const old = before.steps[index];
    const current = after.steps[index];
    if (!old && current) {
      changes.push({ kind: "added", text: `Thêm bước ${circled(current.order)} ${current.name}` });
    } else if (old && !current) {
      changes.push({ kind: "removed", text: `Bỏ bước ${circled(old.order)} ${old.name}` });
    } else if (old && current) {
      const fields = fieldChanges(old, current);
      if (fields.length > 0) {
        changes.push({
          kind: "changed",
          text: `Bước ${circled(current.order)} ${current.name}: ${fields.join("; ")}`,
        });
      }
    }
  }
  return changes;
}

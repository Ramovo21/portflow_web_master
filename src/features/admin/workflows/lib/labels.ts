import type {
  AssigneeRule,
  AssigneeType,
  OnRejectPolicy,
  ResubmitPolicy,
  StepDefinition,
} from "../api/definitions";
import { roleLabel } from "@/features/auth";

export const ASSIGNEE_TYPE_LABELS: Record<AssigneeType, string> = {
  ROLE: "Theo role",
  USER: "Người cụ thể",
  DYNAMIC: "Theo người gửi",
  GROUP: "Nhóm",
};

export const ON_REJECT_LABELS: Record<OnRejectPolicy, string> = {
  BACK_TO_SUBMITTER: "Trả về người gửi để sửa",
  TERMINATE: "Kết thúc hồ sơ",
};

export const RESUBMIT_LABELS: Record<ResubmitPolicy, string> = {
  RESTART: "Duyệt lại từ bước 1",
  RESUME_AT_REQUESTER: "Quay về bước đã yêu cầu sửa (bước trước giữ kết quả)",
};

export const DYNAMIC_EXPRESSIONS: { value: string; label: string }[] = [
  { value: "submitter.department.head", label: "Trưởng phòng của người gửi" },
  { value: "submitter.manager", label: "Quản lý của người gửi" },
];

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮"];

export function circled(order: number): string {
  return CIRCLED[order - 1] ?? `(${order})`;
}

export function assigneeShortLabel(
  rule: AssigneeRule,
  userNames: Record<string, string> = {},
): string {
  const all = (text: string, requiresAll?: boolean) => (requiresAll ? `${text} – tất cả` : text);
  switch (rule.type) {
    case "ROLE":
      return `${rule.value ? roleLabel(rule.value) : "?"}${
        rule.scope === "SAME_DEPARTMENT_AS_SUBMITTER" ? " (cùng phòng)" : ""
      }`;
    case "USER":
      return rule.value ? (userNames[rule.value] ?? `Người dùng ${rule.value.slice(0, 8)}…`) : "?";
    case "DYNAMIC":
      return (
        DYNAMIC_EXPRESSIONS.find((item) => item.value === rule.value)?.label ?? rule.value ?? "?"
      );
    case "GROUP":
      return all(
        rule.userIds.length > 0
          ? `Nhóm ${rule.userIds.length} người`
          : `Nhóm ${rule.value ? roleLabel(rule.value) : "?"}`,
      );
  }
}

export function stepsSummary(steps: StepDefinition[]): string {
  return steps
    .map(
      (step) =>
        `${circled(step.order)} ${step.name}${step.condition ? " ⓘ" : ""}${
          step.requiresAllApprovers ? " (tất cả)" : ""
        }`,
    )
    .join(" → ");
}

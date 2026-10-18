import type { AddendumAction, AddendumResponse } from "../api/addenda";

export function addendumActions(
  addendum: AddendumResponse,
  permissions: { create: boolean; submit: boolean },
): AddendumAction[] {
  if (addendum.allowedActions) return addendum.allowedActions;
  const editable = addendum.status === "DRAFT" || addendum.status === "REVISION_REQUESTED";
  const actions: AddendumAction[] = [];
  if (editable && permissions.create) actions.push("UPDATE", "UPLOAD_ATTACHMENT");
  if (editable && permissions.submit) actions.push("SUBMIT");
  if (
    permissions.create &&
    ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "REVISION_REQUESTED", "APPROVED"].includes(
      addendum.status,
    )
  ) {
    actions.push("CANCEL");
  }
  return actions;
}

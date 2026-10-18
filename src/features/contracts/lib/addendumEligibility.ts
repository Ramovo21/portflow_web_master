import type { AddendumType } from "../api/addenda";
import type { ContractStatus } from "../api/contracts";

export const EXTENSION_MAX_DAYS_BEFORE_EXPIRY = 90;
export const EXTENSION_MAX_DAYS_AFTER_EXPIRY = 30;

export interface Eligibility {
  allowed: boolean;
  reason?: string;
}

export function addendumEligibility(
  type: AddendumType,
  status: ContractStatus,
  daysToEnd: number,
): Eligibility {
  if (type === "EXTENSION") {
    if (status === "ACTIVE") {
      return daysToEnd <= EXTENSION_MAX_DAYS_BEFORE_EXPIRY
        ? { allowed: true }
        : {
            allowed: false,
            reason: `${daysToEnd} days left – extension is only allowed when ≤ ${EXTENSION_MAX_DAYS_BEFORE_EXPIRY} days remain`,
          };
    }
    if (status === "EXPIRED") {
      return -daysToEnd <= EXTENSION_MAX_DAYS_AFTER_EXPIRY
        ? { allowed: true }
        : {
            allowed: false,
            reason: `Expired more than ${EXTENSION_MAX_DAYS_AFTER_EXPIRY} days ago – duplicate the contract instead`,
          };
    }
    return { allowed: false, reason: "Only active or recently expired contracts can be extended" };
  }
  return status === "APPROVED" || status === "ACTIVE"
    ? { allowed: true }
    : { allowed: false, reason: "Only when the contract is approved or active" };
}

import type { Customer } from "./api/customers";

export function customerActions(
  customer: Customer,
  hasPermission: (permission: string) => boolean,
) {
  if (customer.allowedActions) {
    const allowed = new Set(customer.allowedActions);
    return {
      update: allowed.has("UPDATE"),
      suspend: allowed.has("SUSPEND"),
      reactivate: allowed.has("REACTIVATE"),
    };
  }
  const canSuspend = hasPermission("Customer.Suspend");
  return {
    update: hasPermission("Customer.Update"),
    suspend: canSuspend && customer.status === "ACTIVE",
    reactivate: canSuspend && customer.status === "SUSPENDED",
  };
}

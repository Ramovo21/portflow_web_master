import { idempotencyHeader, ifMatchHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";
import type { PageResponse } from "@/shared/types/api";

export type CustomerStatus = "ACTIVE" | "SUSPENDED";

export interface Representative {
  fullName: string | null;
  position: string | null;
}

export interface Contact {
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  primary: boolean;
}

export interface CustomerListItem {
  id: string;
  code: string;
  name: string;
  taxCode: string;
  address: string | null;
  status: CustomerStatus;
  ownerDepartmentId: string;
  createdAt: string;
  version: number;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  taxCode: string;
  address: string | null;
  representative: Representative | null;
  contacts: Contact[];
  status: CustomerStatus;
  statusReason: string | null;
  ownerDepartmentId: string;
  version: number;
  createdAt: string;
  updatedAt: string | null;

  allowedActions?: string[];
}

export interface CustomerPayload {
  name: string;
  address: string | null;
  representative: Representative | null;
  contacts: Contact[];
}

export interface CreateCustomerPayload extends CustomerPayload {
  taxCode: string;
}

export interface CustomerListParams {
  q?: string;
  status?: string;
  page: number;
  size: number;
}

export interface CustomerContractRow {
  contract: {
    id: string;
    number: string;
    title: string;
    status: string;
    effectiveFrom: string;
    effectiveTo: string;
    value: number;
    currency: string;
  };
  revision: number;
  updatedAt: string;
  workflow: {
    order: number | null;
    name: string | null;
    assignees: { id: string; fullName: string | null }[];
  } | null;
}

export interface CustomerPriceListRow {
  id: string;
  code: string;
  serviceType: string;
  name: string;
  listVersion: number;
  status: string;
  validFrom: string;
  validTo: string | null;
}

export function fetchCustomers(
  params: CustomerListParams,
): Promise<PageResponse<CustomerListItem>> {
  return http
    .get<PageResponse<CustomerListItem>>("/v1/customers", { params })
    .then((res) => res.data);
}

export function fetchCustomer(id: string): Promise<Customer> {
  return http.get<Customer>(`/v1/customers/${id}`).then((res) => res.data);
}

export function createCustomer(
  payload: CreateCustomerPayload,
  idempotencyKey: string,
): Promise<Customer> {
  return http
    .post<Customer>("/v1/customers", payload, idempotencyHeader(idempotencyKey))
    .then((res) => res.data);
}

export function updateCustomer(
  id: string,
  version: number,
  payload: CustomerPayload,
): Promise<Customer> {
  return http
    .put<Customer>(`/v1/customers/${id}`, payload, ifMatchHeader(version))
    .then((res) => res.data);
}

export function suspendCustomer(
  id: string,
  reason: string,
  idempotencyKey: string,
): Promise<Customer> {
  return http
    .post<Customer>(`/v1/customers/${id}/suspend`, { reason }, idempotencyHeader(idempotencyKey))
    .then((res) => res.data);
}

export function reactivateCustomer(
  id: string,
  reason: string,
  idempotencyKey: string,
): Promise<Customer> {
  return http
    .post<Customer>(`/v1/customers/${id}/reactivate`, { reason }, idempotencyHeader(idempotencyKey))
    .then((res) => res.data);
}

export function checkTaxCode(taxCode: string): Promise<{ taxCode: string; exists: boolean }> {
  return http
    .get<{ taxCode: string; exists: boolean }>("/v1/customers/check-tax-code", {
      params: { taxCode },
    })
    .then((res) => res.data);
}

export function fetchCustomerContracts(
  customerId: string,
  params: { status?: string; page?: number; size?: number } = {},
): Promise<PageResponse<CustomerContractRow>> {
  return http
    .get<PageResponse<CustomerContractRow>>("/v1/contracts", {
      params: { customerId, page: 0, size: 10, ...params },
    })
    .then((res) => res.data);
}

export function fetchCustomerPriceLists(
  customerId: string,
): Promise<PageResponse<CustomerPriceListRow>> {
  return http
    .get<PageResponse<CustomerPriceListRow>>("/v1/price-lists", {
      params: { scope: "CUSTOMER", scopeId: customerId, page: 0, size: 50 },
    })
    .then((res) => res.data);
}

export interface OverviewWarning {
  code: string;
  documentType: string;
  documentId: string;
  reference: string;
  dueDate: string;
  daysLeft: number;
}

export interface OverviewContract {
  id: string;
  number: string;
  title: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  value: number | null;
  currency: string;
}

export interface OverviewPriceList {
  id: string;
  code: string;
  serviceType: string;
  listVersion: number;
  status: string;
  validFrom: string;
  validTo: string | null;
}

export interface CustomerOverview {
  customer: {
    id: string;
    code: string;
    name: string;
    taxCode: string;
    status: CustomerStatus;
    statusReason: string | null;
  };
  sections: {
    contracts?: {
      total: number;
      byStatus: Record<string, number>;
      items: OverviewContract[];
    } | null;
    priceLists?: { effective: OverviewPriceList[] } | null;
  };
  warnings: OverviewWarning[];
  unavailable: string[];
}

export function fetchCustomerOverview(id: string): Promise<CustomerOverview> {
  return http.get<CustomerOverview>(`/v1/customers/${id}/overview`).then((res) => res.data);
}

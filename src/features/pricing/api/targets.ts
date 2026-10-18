import { http } from "@/shared/lib/http";
import type { PageResponse } from "@/shared/types/api";

export interface CustomerOption {
  id: string;
  code: string;
  name: string;
  taxCode: string;
  status: string;
}

export interface ContractOption {
  id: string;
  number: string;
  title: string;
  customerId: string;
  customerName: string | null;
  status: string;
  effectiveFrom: string;
  effectiveTo: string;
}

export interface ContractTarget extends ContractOption {
  services: { serviceCode: string; mandatory: boolean }[];
}

interface ContractListItem {
  contract: {
    id: string;
    number: string;
    title: string;
    customerId: string;
    status: string;
    effectiveFrom: string;
    effectiveTo: string;
  };
  customerName: string | null;
}

export function searchCustomers(q: string): Promise<CustomerOption[]> {
  return http
    .get<PageResponse<CustomerOption>>("/v1/customers", {
      params: { q: q || undefined, status: "ACTIVE", size: 20 },
    })
    .then((res) => res.data.items);
}

export function fetchCustomer(id: string): Promise<CustomerOption> {
  return http.get<CustomerOption>(`/v1/customers/${id}`).then((res) => res.data);
}

export function searchContracts(q: string): Promise<ContractOption[]> {
  return http
    .get<PageResponse<ContractListItem>>("/v1/contracts", {
      params: { q: q || undefined, size: 20 },
    })
    .then((res) =>
      res.data.items.map((item) => ({ ...item.contract, customerName: item.customerName })),
    );
}

export function fetchContract(id: string): Promise<ContractTarget> {
  return http.get<ContractTarget>(`/v1/contracts/${id}`).then((res) => res.data);
}

import { http } from "@/shared/lib/http";

export type DataScope = "DEPARTMENT" | "ALL";

export interface DepartmentRef {
  id: string;
  code: string;
  name: string;
}

export interface ActingFor {
  userId: string;
  fullName: string | null;
  documentTypes: string[];
  validTo: string;
}

export interface Me {
  id: string;
  username: string;
  fullName: string;
  department: DepartmentRef | null;
  roles: string[];
  dataScope: DataScope;
  permissions: string[];
  actingFor: ActingFor[];
}

export const meQueryKey = ["me"] as const;

export function fetchMe(): Promise<Me> {
  return http.get<Me>("/v1/me").then((res) => res.data);
}

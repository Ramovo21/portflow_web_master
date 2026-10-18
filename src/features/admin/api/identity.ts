import { idempotencyHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";

export type DataScope = "DEPARTMENT" | "ALL";

/** Bản sao người dùng Keycloak (`GET /v1/admin/users`). */
export interface UserRow {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  active: boolean;
  sodViolation: boolean;
  syncedAt: string | null;
  syncSource: "JIT" | "JOB" | "MANUAL" | "SEED" | null;
  lastSeenAt: string | null;
  roles: string[];
}

export interface UserFilter {
  q?: string;
  departmentId?: string;
  role?: string;
  active?: boolean;
}

export interface SyncResult {
  synced: number;
  deactivated: number;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  headUserId: string | null;
  parentId: string | null;
  version: number;
}

export interface DepartmentInput {
  code: string;
  name: string;
  headUserId?: string | null;
  parentId?: string | null;
}

export interface Role {
  code: string;
  name: string;
  permissions: string[];
  dataScope: DataScope;
  system: boolean;
  version: number;
}

export interface RoleInput {
  name: string;
  permissions: string[];
  dataScope: DataScope;
}

export interface DocumentType {
  code: string;
  name: string;
  requiresESign: boolean;
  workflowKey: string;
  active: boolean;
  submitRequirements: unknown;
}

export interface DocumentTypeInput {
  name: string;
  requiresESign: boolean;
  workflowKey: string;
  active: boolean;
  submitRequirements: unknown;
}

export function fetchUsers(filter: UserFilter = {}): Promise<UserRow[]> {
  return http
    .get<UserRow[]>("/v1/admin/users", {
      params: {
        q: filter.q || undefined,
        departmentId: filter.departmentId || undefined,
        role: filter.role || undefined,
        active: filter.active,
      },
    })
    .then((res) => res.data);
}

/** Đồng bộ ngay toàn bộ user từ Keycloak (đọc Admin API, có thể mất vài giây). */
export function syncUsers(): Promise<SyncResult> {
  return http
    .post<SyncResult>("/v1/admin/users/sync", null, { timeout: 120_000 })
    .then((res) => res.data);
}

export function fetchDepartments(): Promise<Department[]> {
  return http.get<Department[]>("/v1/admin/departments").then((res) => res.data);
}

export function createDepartment(input: DepartmentInput, key: string): Promise<Department> {
  return http
    .post<Department>("/v1/admin/departments", input, idempotencyHeader(key))
    .then((res) => res.data);
}

export function updateDepartment(id: string, input: DepartmentInput): Promise<Department> {
  return http.put<Department>(`/v1/admin/departments/${id}`, input).then((res) => res.data);
}

export function fetchRoles(): Promise<Role[]> {
  return http.get<Role[]>("/v1/admin/roles").then((res) => res.data);
}

export function updateRole(code: string, input: RoleInput): Promise<Role> {
  return http.put<Role>(`/v1/admin/roles/${code}`, input).then((res) => res.data);
}

export function fetchPermissionCatalog(): Promise<string[]> {
  return http.get<string[]>("/v1/admin/permissions").then((res) => res.data);
}

export function fetchDocumentTypes(): Promise<DocumentType[]> {
  return http.get<DocumentType[]>("/v1/admin/document-types").then((res) => res.data);
}

export function updateDocumentType(code: string, input: DocumentTypeInput): Promise<DocumentType> {
  return http.put<DocumentType>(`/v1/admin/document-types/${code}`, input).then((res) => res.data);
}

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { meQueryKey } from "@/features/auth/api/me";
import { useIdempotentMutation } from "@/shared/hooks/useIdempotentMutation";

import {
  createDepartment,
  fetchDepartments,
  fetchDocumentTypes,
  fetchPermissionCatalog,
  fetchRoles,
  fetchUsers,
  syncUsers,
  updateDepartment,
  updateDocumentType,
  updateRole,
  type DepartmentInput,
  type DocumentTypeInput,
  type RoleInput,
  type UserFilter,
} from "../api/identity";
import { fetchIncompletePublications, resubmitOutbox } from "../api/outbox";

export const identityKeys = {
  users: (filter: UserFilter = {}) => ["admin", "users", filter] as const,
  allUsers: ["admin", "users"] as const,
  departments: ["admin", "departments"] as const,
  roles: ["admin", "roles"] as const,
  permissions: ["admin", "permissions"] as const,
  documentTypes: ["admin", "document-types"] as const,
  outbox: ["admin", "outbox"] as const,
};

export function useUsers(filter: UserFilter = {}) {
  return useQuery({
    queryKey: identityKeys.users(filter),
    queryFn: () => fetchUsers(filter),
    placeholderData: keepPreviousData,
  });
}

export function useSyncUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncUsers,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.allUsers });
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useDepartments() {
  return useQuery({ queryKey: identityKeys.departments, queryFn: fetchDepartments });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useIdempotentMutation((input: DepartmentInput, key) => createDepartment(input, key), {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: identityKeys.departments }),
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DepartmentInput }) =>
      updateDepartment(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.departments });
      void queryClient.invalidateQueries({ queryKey: identityKeys.allUsers });
    },
  });
}

export function useRoles() {
  return useQuery({ queryKey: identityKeys.roles, queryFn: fetchRoles });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: identityKeys.permissions,
    queryFn: fetchPermissionCatalog,
    staleTime: Infinity,
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, input }: { code: string; input: RoleInput }) => updateRole(code, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.roles });
      // Quyền của chính mình có thể đổi theo role vừa sửa.
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useDocumentTypeList() {
  return useQuery({ queryKey: identityKeys.documentTypes, queryFn: fetchDocumentTypes });
}

export function useUpdateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, input }: { code: string; input: DocumentTypeInput }) =>
      updateDocumentType(code, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: identityKeys.documentTypes });
      void queryClient.invalidateQueries({ queryKey: ["wf-ref", "document-types"] });
    },
  });
}

export function useIncompletePublications() {
  return useQuery({
    queryKey: identityKeys.outbox,
    queryFn: () => fetchIncompletePublications(),
    refetchInterval: 30_000,
  });
}

export function useResubmitOutbox() {
  const queryClient = useQueryClient();
  return useIdempotentMutation((_: void, key) => resubmitOutbox(key), {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: identityKeys.outbox }),
  });
}

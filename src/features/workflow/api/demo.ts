import axios from "axios";

import { idempotencyHeader } from "@/shared/hooks/useIdempotentMutation";
import { http } from "@/shared/lib/http";

import type { WorkflowStartResult } from "./workflow";

/**
 * Chỉ dùng khi phát triển: backend .NET bật `Portflow:Workflow:Demo:Enabled` thì có loại hồ sơ DEMO để thử luồng
 * duyệt F03 khi chưa có module hồ sơ. Tắt → endpoint trả 404 và UI ẩn nút.
 */
export interface DemoStatus {
  enabled: boolean;
  documentType: string;
}

export interface DemoSubmission {
  title: string;
  customerName?: string;
  amount: number;
}

export interface DemoSubmitted {
  documentId: string;
  workflow: WorkflowStartResult;
}

export async function fetchDemoStatus(): Promise<DemoStatus | null> {
  try {
    return (await http.get<DemoStatus>("/v1/dev/workflow-demo")).data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export function submitDemo(input: DemoSubmission, key: string): Promise<DemoSubmitted> {
  return http
    .post<DemoSubmitted>("/v1/dev/workflow-demo", input, idempotencyHeader(key))
    .then((res) => res.data);
}

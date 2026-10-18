import axios from "axios";

export interface Problem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errorCode?: string;
  correlationId?: string;
  errors?: ProblemFieldError[];

  [extra: string]: unknown;
}

export interface ProblemFieldError {
  field?: string;
  code?: string;
  message?: string;
}

const MESSAGES: Record<string, string> = {
  AUTH_UNAUTHENTICATED: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
  AUTH_TOKEN_EXPIRED: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
  AUTH_INVALID_TOKEN: "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại.",
  AUTH_USER_INACTIVE: "Tài khoản đã bị vô hiệu hóa.",
  AUTH_USER_NOT_PROVISIONED: "Tài khoản chưa được gán phòng ban.",
  AUTH_FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  AUTH_SOD_VIOLATION: "Tài khoản quản trị không được tham gia duyệt (tách quyền).",
  AUTH_IDP_UNAVAILABLE: "Máy chủ đăng nhập (Keycloak) không phản hồi.",
  AUTH_DELEGATION_OVERLAP:
    "Khoảng thời gian trùng với một ủy quyền đang hiệu lực. Thu hồi ủy quyền đó hoặc chọn ngày khác.",
  AUTH_SYSTEM_ROLE_IMMUTABLE: "Vai trò hệ thống không sửa được.",
  AUTH_DEPARTMENT_CODE_EXISTS: "Mã phòng ban đã tồn tại.",

  SYS_BAD_REQUEST: "Yêu cầu không hợp lệ.",
  SYS_NOT_FOUND: "Không tìm thấy dữ liệu.",
  SYS_IDEMPOTENCY_KEY_REQUIRED: "Thiếu khóa chống gửi trùng (Idempotency-Key).",
  SYS_IDEMPOTENCY_KEY_REUSED: "Yêu cầu này đã được gửi với nội dung khác. Hãy thao tác lại.",
  SYS_IDEMPOTENCY_IN_PROGRESS: "Yêu cầu trước vẫn đang được xử lý, vui lòng đợi.",
  SYS_FILE_TOO_LARGE: "Tệp vượt quá 25 MB.",
  SYS_FILE_TYPE_NOT_ALLOWED: "Chỉ nhận tệp PDF, DOCX, XLSX, PNG, JPG.",
  SYS_ATTACHMENT_ENTITY_UNSUPPORTED: "Loại hồ sơ này không hỗ trợ tệp đính kèm.",
  SYS_DATA_INTEGRITY: "Dữ liệu vi phạm ràng buộc, vui lòng kiểm tra lại.",
  SYS_INTERNAL: "Lỗi hệ thống. Vui lòng thử lại hoặc gửi mã tra cứu cho IT.",

  WF_NOT_ASSIGNEE: "Bạn không phải người duyệt của bước này.",
  WF_STEP_NOT_ACTIVE: "Bước này vừa được người khác xử lý.",
  WF_CONFLICT: "Bước này vừa được người khác xử lý.",
  WF_ALREADY_VOTED: "Bạn đã gửi ý kiến cho bước này rồi.",
  WF_COMMENT_REQUIRED: "Vui lòng nhập ý kiến khi từ chối hoặc yêu cầu sửa.",
  WF_CONDITION_ERROR: "Điều kiện duyệt được cấu hình sai. Vui lòng liên hệ quản trị viên.",
  WF_NO_ACTIVE_DEFINITION: "Loại hồ sơ này chưa có quy trình duyệt đang áp dụng.",
  WF_DEFINITION_INVALID: "Định nghĩa quy trình chưa hợp lệ.",
  WF_DEFINITION_NOT_EDITABLE: "Chỉ sửa được định nghĩa ở trạng thái nháp.",
  WF_DEFINITION_NOT_FOUND: "Không tìm thấy định nghĩa quy trình.",
  WF_UNKNOWN_DOCUMENT_TYPE: "Loại hồ sơ này chưa được module nào hỗ trợ duyệt.",
  WF_ALREADY_RUNNING: "Hồ sơ đang trong một luồng duyệt khác.",
  WF_NO_ASSIGNEE: "Không tìm được người duyệt cho một bước (người gửi không được tự duyệt).",
  WF_NOT_SUBMITTER: "Chỉ người gửi hồ sơ mới thực hiện được thao tác này.",
  WF_INVALID_STATE: "Luồng duyệt không còn ở trạng thái cho phép thao tác này.",
  WF_INSTANCE_NOT_FOUND: "Không tìm thấy luồng duyệt.",
  WF_STEP_NOT_FOUND: "Không tìm thấy bước duyệt.",

  CUS_TAX_CODE_DUPLICATE: "Tax code already exists.",
  CUS_TAX_CODE_INVALID: "Tax code must be 10 or 13 digits (0101234567-001).",
  CUS_NOT_FOUND: "Customer not found, or you do not have permission to view it.",
  CUS_VERSION_CONFLICT: "This customer was just updated by someone else.",

  CTR_NOT_FOUND: "Contract not found, or you do not have permission to view it.",
  CTR_NOT_EDITABLE: "A contract can only be edited while in Draft or Change requested status.",
  CTR_CUSTOMER_NOT_ACTIVE:
    "The customer is suspended – a new contract cannot be created or submitted for approval.",
  CTR_ATTACHMENT_REQUIRED: "At least one attachment or service terms are required.",
  CTR_UNKNOWN_SERVICE: "A service code is no longer in the catalog.",
  CTR_ALREADY_IN_WORKFLOW: "The contract is already in an approval workflow.",
  CTR_CANCEL_REASON_REQUIRED:
    "Cancelling an active contract requires a reason of at least 10 characters.",
  CTR_CRITICAL_FIELD_READONLY: "Critical terms can only be changed through an addendum.",
  CTR_VERSION_CONFLICT: "This contract was just updated by someone else.",
  ADD_NOT_FOUND: "Addendum not found, or you do not have permission to view it.",
  ADD_EXTENSION_WINDOW:
    "Extension is only allowed when the contract has ≤ 90 days left or expires within 30 days.",
  ADD_EXTENSION_PENDING: "The contract already has a pending extension addendum.",
  ADD_EFFECTIVE_OUT_OF_CONTRACT:
    "The addendum effective date falls outside the contract's validity period.",

  PRC_NOT_FOUND: "Price list not found, or you do not have permission to view it.",
  PRC_OVERLAP:
    "The effective period overlaps another price list. Create a new version from the current price list.",
  PRC_RETROACTIVE_BILLED:
    "A payment statement has already been issued for this period – prices cannot be changed retroactively.",
  PRC_VERSION_CONFLICT: "A newer version is already being drafted or awaiting approval.",
  PRC_VERSION_NOT_LATEST: "A new version can only be created from the latest approved version.",
  PRC_USED_IN_BILLING:
    "This price list has been used to issue a payment statement – it cannot be edited.",
  SYS_CONCURRENT_MODIFICATION: "Dữ liệu vừa được người khác cập nhật. Vui lòng tải lại.",
  SYS_VALIDATION: "Dữ liệu chưa hợp lệ.",
  SYS_FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
};

export const CONFLICT_CODES = new Set([
  "WF_CONFLICT",
  "WF_STEP_NOT_ACTIVE",
  "CTR_VERSION_CONFLICT",
  "CUS_VERSION_CONFLICT",
  "SYS_CONCURRENT_MODIFICATION",
]);

export function isConflict(error: unknown): boolean {
  const code = errorCodeOf(error);
  return code !== undefined && CONFLICT_CODES.has(code);
}

export function fieldErrorsOf(error: unknown): ProblemFieldError[] {
  return problemOf(error)?.errors ?? [];
}

export function problemOf(error: unknown): Problem | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const data: unknown = error.response?.data;
  return data && typeof data === "object" ? (data as Problem) : undefined;
}

export function errorCodeOf(error: unknown): string | undefined {
  return problemOf(error)?.errorCode;
}

export function statusOf(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function errorMessage(error: unknown): string {
  const problem = problemOf(error);
  const text =
    (problem?.errorCode && MESSAGES[problem.errorCode]) ||
    problem?.detail ||
    (axios.isAxiosError(error) && !error.response
      ? "Không kết nối được máy chủ PortFlow."
      : "Đã xảy ra lỗi.");
  return problem?.correlationId ? `${text} (Mã tra cứu: ${problem.correlationId})` : text;
}

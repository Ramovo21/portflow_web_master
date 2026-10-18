import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { useConflictModal } from "@/shared/components/feedback/useConflictModal";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { todayIso } from "@/shared/lib/format";
import {
  errorCodeOf,
  errorMessage,
  fieldErrorsOf,
  isConflict,
  problemOf,
} from "@/shared/lib/problem";

import type { ContractResponse } from "../api/contracts";
import {
  useContractHistory,
  useCreateContract,
  useCustomerOption,
  useCustomerOptions,
  useInvalidateContract,
  useServiceGroups,
  useServices,
  useSubmitContract,
  useUpdateContract,
} from "../hooks/useContracts";
import {
  contractSchema,
  FIELD_MAP,
  toRequest,
  toValues,
  type ContractFormValues,
} from "../lib/contractSchema";
import { PAYMENT_METHODS } from "../lib/labels";
import { uploadAttachment } from "../api/lookups";
import { isReady, readinessItems } from "../lib/readiness";
import { AttachmentsPanel } from "./AttachmentsPanel";
import { ReadinessChecklist } from "./ReadinessChecklist";
import { ServicePickerModal } from "./ServicePickerModal";
import { ServicesTable, type ServiceRow } from "./ServicesTable";

const moneyFormatter = (value: number | string | undefined) =>
  value === undefined || value === ""
    ? ""
    : `${value}`.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const moneyParser = (value: string | undefined) =>
  Number((value ?? "").replace(/\./g, "").replace(",", ".")) as 0;

interface Props {
  contract?: ContractResponse;
  presetCustomerId?: string;

  onReload?(): void;
}

export function ContractForm({ contract, presetCustomerId, onReload }: Props) {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const showConflict = useConflictModal();
  const invalidate = useInvalidateContract();
  const services = useServices();
  const groups = useServiceGroups();
  const create = useCreateContract();
  const update = useUpdateContract();
  const submit = useSubmitContract();

  const [saved, setSaved] = useState<{ id: string; version: number } | undefined>(
    contract ? { id: contract.id, version: contract.version } : undefined,
  );
  const [attachments, setAttachments] = useState(contract?.attachments ?? []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState<unknown>();
  const [invalidCodes, setInvalidCodes] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [leaveTo, setLeaveTo] = useState<string>();

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: toValues(contract, presetCustomerId),
  });

  const values = useWatch({ control });
  const busy = isSubmitting || create.isPending || update.isPending || submit.isPending;
  useUnsavedChangesGuard((isDirty || pendingFiles.length > 0) && !leaveTo && !busy);

  useEffect(() => {
    if (leaveTo) navigate(leaveTo);
  }, [leaveTo, navigate]);

  const options = useCustomerOptions(customerQuery, "ACTIVE");
  const selected = useCustomerOption(values.customerId);
  const customerOptions = useMemo(() => {
    const list = options.data ?? [];
    const current = selected.data;
    return current && !list.some((option) => option.id === current.id) ? [current, ...list] : list;
  }, [options.data, selected.data]);
  const customerStatus =
    customerOptions.find((option) => option.id === values.customerId)?.status ??
    (contract?.customerId === values.customerId
      ? (contract?.customerStatus ?? undefined)
      : undefined);

  const readiness = readinessItems({
    customerActive: values.customerId
      ? customerStatus
        ? customerStatus === "ACTIVE"
        : undefined
      : undefined,
    datesValid:
      !!values.effectiveFrom && !!values.effectiveTo && values.effectiveFrom <= values.effectiveTo,
    serviceCount: values.services?.length ?? 0,
    attachmentCount: attachments.length + pendingFiles.length,
    serviceTerms: values.serviceTerms,
  });

  const history = useContractHistory(
    contract?.status === "REVISION_REQUESTED" ? contract.id : undefined,
  );
  const revisionNote = history.data
    ?.filter((item) => item.action === "REQUEST_REVISION" || item.action === "REJECT")
    .at(-1);

  const applyServerErrors = (error: unknown) => {
    for (const item of fieldErrorsOf(error)) {
      const field = item.field ? FIELD_MAP[item.field] : undefined;
      if (field) setError(field, { message: item.message ?? "Invalid" });
    }
    const code = errorCodeOf(error);
    if (code === "CTR_CUSTOMER_NOT_ACTIVE")
      setError("customerId", { message: "The customer is suspended" });
    if (code === "CTR_INVALID_DATE_RANGE")
      setError("effectiveTo", { message: "Start date must be on or before the end date" });
    if (code === "CTR_UNKNOWN_SERVICE") {
      const match = /\[(.+)]/.exec(problemOf(error)?.detail ?? "");
      setInvalidCodes(match ? match[1].split(",").map((code) => code.trim()) : []);
    }
  };

  /** Uploads files picked before the contract existed; failed ones stay queued for the next save. */
  const uploadPending = async (contractId: string) => {
    const uploaded = [];
    const failed: File[] = [];
    for (const file of pendingFiles) {
      try {
        uploaded.push(await uploadAttachment("CONTRACT", contractId, file, crypto.randomUUID()));
      } catch (error) {
        failed.push(file);
        message.error(`${file.name}: ${errorMessage(error)}`);
      }
    }
    setPendingFiles(failed);
    return uploaded;
  };

  const save = async (formValues: ContractFormValues): Promise<ContractResponse | undefined> => {
    setSubmitError(undefined);
    setInvalidCodes([]);
    try {
      let result: ContractResponse;
      if (saved) {
        result = await update.mutateAsync({
          id: saved.id,
          version: saved.version,
          body: toRequest(formValues),
        });
      } else {
        create.resetKey();
        result = await create.mutateAsync(toRequest(formValues));
      }
      setSaved({ id: result.id, version: result.version });
      reset(formValues);
      const uploaded = await uploadPending(result.id);
      setAttachments([...result.attachments, ...uploaded]);
      invalidate(result.id);
      return { ...result, attachments: [...result.attachments, ...uploaded] };
    } catch (error) {
      if (isConflict(error)) {
        showConflict(error, () => onReload?.());
      } else {
        applyServerErrors(error);
        setSubmitError(error);
      }
      return undefined;
    }
  };

  const onSaveDraft = handleSubmit(async (formValues) => {
    const result = await save(formValues);
    if (!result) return;
    message.success(`Draft saved: ${result.number}`);

    setLeaveTo(contract ? `/contracts/${result.id}` : `/contracts/${result.id}/edit`);
  });

  const onSaveAndSubmit = handleSubmit((formValues) => {
    modal.confirm({
      title:
        contract?.status === "REVISION_REQUESTED" ? "Gửi lại hợp đồng?" : "Gửi duyệt hợp đồng?",
      content:
        "Hợp đồng sẽ được lưu rồi chuyển tới người duyệt bước đầu. Trong lúc duyệt không sửa được.",
      okText: "Lưu & gửi duyệt",
      cancelText: "Đóng",
      onOk: async () => {
        const result = await save(formValues);
        if (!result) return;
        try {
          submit.resetKey();
          const response = await submit.mutateAsync(result.id);
          const holder = response.workflow.currentStep?.assignees
            .map((person) => person.fullName)
            .join(", ");
          message.success(
            holder ? `Submitted for approval – waiting for ${holder}` : "Submitted for approval",
          );
          setLeaveTo(`/contracts/${result.id}`);
        } catch (error) {
          applyServerErrors(error);
          setSubmitError(error);
        }
      },
    });
  });

  const fieldStatus = (name: keyof ContractFormValues) =>
    errors[name] ? { validateStatus: "error" as const, help: errors[name]?.message as string } : {};

  return (
    <Form layout="vertical" component="div" requiredMark>
      {revisionNote && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${revisionNote.actorName ?? "Người duyệt"} ${revisionNote.action === "REJECT" ? "trả về" : "yêu cầu sửa"}${
            revisionNote.stepName ? ` ở bước ${revisionNote.stepName}` : ""
          }`}
          description={revisionNote.comment ? `“${revisionNote.comment}”` : undefined}
        />
      )}
      {submitError !== undefined && (
        <ProblemAlert error={submitError} style={{ marginBottom: 16 }} />
      )}

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} xl={16}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card size="small" title="① Thông tin chung">
              <Form.Item label="Khách hàng" required {...fieldStatus("customerId")}>
                <Controller
                  control={control}
                  name="customerId"
                  render={({ field }) => (
                    <Select
                      {...field}
                      showSearch
                      allowClear
                      placeholder="Tìm theo tên, mã hoặc MST"
                      filterOption={false}
                      onSearch={setCustomerQuery}
                      loading={options.isFetching}
                      aria-label="Khách hàng"
                      notFoundContent={
                        options.isFetching ? "Searching…" : "No matching active customers"
                      }
                      options={customerOptions.map((option) => ({
                        value: option.id,
                        label: (
                          <span>
                            {option.name}{" "}
                            <Typography.Text type="secondary">
                              – {option.code} · MST {option.taxCode}
                            </Typography.Text>
                            {option.status === "SUSPENDED" && (
                              <Tag color="error" style={{ marginInlineStart: 6 }}>
                                Tạm ngưng
                              </Tag>
                            )}
                          </span>
                        ),
                      }))}
                    />
                  )}
                />
              </Form.Item>
              <Form.Item label="Tiêu đề" required {...fieldStatus("title")}>
                <Controller
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <Input
                      {...field}
                      maxLength={255}
                      placeholder="HĐ dịch vụ xếp dỡ container 2027"
                      aria-label="Tiêu đề"
                    />
                  )}
                />
              </Form.Item>
              <Form.Item
                label="Hiệu lực"
                required
                {...(errors.effectiveFrom || errors.effectiveTo
                  ? {
                      validateStatus: "error" as const,
                      help: (errors.effectiveTo ?? errors.effectiveFrom)?.message,
                    }
                  : {})}
              >
                <DatePicker.RangePicker
                  format="DD/MM/YYYY"
                  style={{ width: "100%" }}
                  aria-label="Hiệu lực"
                  value={
                    values.effectiveFrom && values.effectiveTo
                      ? [dayjs(values.effectiveFrom), dayjs(values.effectiveTo)]
                      : null
                  }
                  onChange={(range) => {
                    setValue("effectiveFrom", range?.[0]?.format("YYYY-MM-DD") ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setValue("effectiveTo", range?.[1]?.format("YYYY-MM-DD") ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                />
              </Form.Item>
              {values.effectiveFrom && values.effectiveFrom < todayIso() && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginTop: -8, marginBottom: 16 }}
                  title="Start date has passed – the contract takes effect as soon as it is approved."
                />
              )}
              <Form.Item label="Giá trị" required {...fieldStatus("amount")}>
                <Space.Compact style={{ width: "100%" }}>
                  <Controller
                    control={control}
                    name="amount"
                    render={({ field }) => (
                      <InputNumber
                        value={field.value}
                        onChange={(value) => field.onChange(value ?? undefined)}
                        onBlur={field.onBlur}
                        min={0}
                        precision={2}
                        formatter={moneyFormatter}
                        parser={moneyParser}
                        style={{ width: "100%" }}
                        placeholder="3.600.000.000"
                        aria-label="Giá trị"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="currency"
                    render={({ field }) => (
                      <Select
                        {...field}
                        style={{ width: 100 }}
                        aria-label="Tiền tệ"
                        options={[
                          { value: "VND", label: "VND" },
                          { value: "USD", label: "USD" },
                        ]}
                      />
                    )}
                  />
                </Space.Compact>
              </Form.Item>
            </Card>

            <Card size="small" title="② Điều khoản thanh toán">
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item label="Số ngày" required {...fieldStatus("paymentDays")}>
                    <Controller
                      control={control}
                      name="paymentDays"
                      render={({ field }) => (
                        <InputNumber
                          value={field.value}
                          onChange={(value) => field.onChange(value ?? undefined)}
                          min={0}
                          max={365}
                          precision={0}
                          style={{ width: "100%" }}
                          aria-label="Số ngày thanh toán"
                        />
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={16}>
                  <Form.Item label="Phương thức" required {...fieldStatus("paymentMethod")}>
                    <Controller
                      control={control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <AutoComplete
                          {...field}
                          aria-label="Phương thức thanh toán"
                          options={PAYMENT_METHODS}
                          placeholder="Select or type"
                          filterOption={(input, option) =>
                            !!option &&
                            (option.label ?? "").toLowerCase().includes(input.toLowerCase())
                          }
                        />
                      )}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Ghi chú" style={{ marginBottom: 0 }}>
                <Controller
                  control={control}
                  name="paymentNote"
                  render={({ field }) => (
                    <Input {...field} placeholder="Thanh toán theo bảng thanh toán tháng" />
                  )}
                />
              </Form.Item>
            </Card>

            <Card size="small" title="③ Điều khoản dịch vụ">
              <Controller
                control={control}
                name="serviceTerms"
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    autoSize={{ minRows: 4, maxRows: 12 }}
                    placeholder="Phạm vi dịch vụ, cam kết chất lượng, trách nhiệm các bên…"
                    aria-label="Điều khoản dịch vụ"
                  />
                )}
              />
            </Card>

            <Card
              size="small"
              title="④ Dịch vụ áp dụng"
              extra={
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => setPickerOpen(true)}
                  loading={services.isLoading}
                >
                  Thêm dịch vụ
                </Button>
              }
            >
              <ServicesTable
                rows={(values.services ?? []) as ServiceRow[]}
                catalog={services.data ?? []}
                groups={groups.data ?? []}
                invalidCodes={invalidCodes}
                onChange={(rows) =>
                  setValue("services", rows, { shouldDirty: true, shouldValidate: true })
                }
              />
              <ServicePickerModal
                open={pickerOpen}
                services={services.data ?? []}
                groups={groups.data ?? []}
                excludeCodes={(values.services ?? []).map((row) => row.serviceCode ?? "")}
                onCancel={() => setPickerOpen(false)}
                onSelect={(picked) => {
                  setValue(
                    "services",
                    [
                      ...((values.services ?? []) as ServiceRow[]),
                      ...picked.map((service) => ({
                        serviceCode: service.code,
                        mandatory: service.mandatoryDefault,
                      })),
                    ],
                    { shouldDirty: true, shouldValidate: true },
                  );
                  setPickerOpen(false);
                }}
              />
            </Card>

            <Card size="small" title="⑤ Tệp đính kèm">
              <AttachmentsPanel
                entityType="CONTRACT"
                entityId={saved?.id}
                attachments={attachments}
                canUpload
                pendingFiles={pendingFiles}
                onPendingChange={setPendingFiles}
                onUploaded={(attachment) => {
                  setAttachments((current) => [...current, attachment]);
                  if (saved) invalidate(saved.id);
                }}
              />
            </Card>
          </Space>
        </Col>
        <Col xs={24} xl={8}>
          <div className="pf-doc-side">
            <ReadinessChecklist items={readiness} />
          </div>
        </Col>
      </Row>

      <Flex className="pf-sticky-footer" justify="space-between" align="center" gap={8} wrap>
        <Typography.Text type="secondary">
          {isDirty ? "Unsaved changes ●" : saved ? "Saved" : ""}
        </Typography.Text>
        <Space wrap>
          <Button
            onClick={() => navigate(saved ? `/contracts/${saved.id}` : "/contracts")}
            disabled={busy}
          >
            Hủy
          </Button>
          <Button onClick={() => void onSaveDraft()} loading={create.isPending || update.isPending}>
            Lưu nháp
          </Button>
          <Button
            type="primary"
            onClick={() => void onSaveAndSubmit()}
            disabled={!isReady(readiness)}
            loading={submit.isPending}
            title={
              isReady(readiness)
                ? undefined
                : "Complete the checklist on the right to submit for approval"
            }
          >
            {contract?.status === "REVISION_REQUESTED" ? "Lưu & gửi lại" : "Lưu & gửi duyệt"}
          </Button>
        </Space>
      </Flex>
    </Form>
  );
}

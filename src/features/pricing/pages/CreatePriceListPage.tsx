import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Flex,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useServiceGroups, useServices } from "@/features/catalog/hooks/useCatalog";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { PageHeader } from "@/shared/components/page/PageHeader";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { formatDate, todayIso } from "@/shared/lib/format";
import { errorCodeOf, errorMessage } from "@/shared/lib/problem";

import type { PriceScope } from "../api/priceLists";
import { PriceLinesEditor } from "../components/PriceLinesEditor";
import { lineProblems, newLine, toLineInputs, type EditableLine } from "../lines";
import { PriorityExplainer } from "../components/PriorityExplainer";
import { ContractSelect, CustomerSelect } from "../components/ScopeTargetSelect";
import { SCOPE_META, expectedApprovalSteps } from "../domain";
import {
  findPriceListIdByCode,
  useContractTarget,
  useCreatePriceList,
  useOverlapCheck,
  useReferencePrices,
  useSubmitPriceList,
} from "../hooks/usePricing";
import { LINE_ERROR_CODES, lineErrorCodes } from "../lineErrors";

interface HeaderValues {
  scope: PriceScope;
  customerId?: string | null;
  contractId?: string | null;
  serviceType?: string;
  name: string;
  currency: string;
  validFrom?: Dayjs;
  validTo?: Dayjs | null;
  note?: string;
}

const SCOPE_ORDER: PriceScope[] = ["CONTRACT", "CUSTOMER", "SERVICE_GROUP", "GLOBAL"];

export function CreatePriceListPage() {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form] = Form.useForm<HeaderValues>();
  const groups = useServiceGroups();
  const services = useServices({ active: true });
  const create = useCreatePriceList();
  const submit = useSubmitPriceList();
  const [lines, setLines] = useState<EditableLine[]>([newLine()]);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<{ id: string; submitError?: string } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [errorCodes, setErrorCodes] = useState<string[]>([]);
  const [showReference, setShowReference] = useState(true);

  const initialScope = (params.get("scope") as PriceScope | null) ?? "CUSTOMER";
  const scope = (Form.useWatch("scope", form) ?? initialScope) as PriceScope;
  const customerId = Form.useWatch("customerId", form);
  const contractId = Form.useWatch("contractId", form);
  const serviceType = Form.useWatch("serviceType", form);
  const validFrom = Form.useWatch("validFrom", form);
  const validTo = Form.useWatch("validTo", form);
  const currency = Form.useWatch("currency", form) ?? "VND";
  const contract = useContractTarget(scope === "CONTRACT" ? contractId : null);
  const reference = useReferencePrices(showReference && scope !== "GLOBAL", todayIso());

  const groupId = groups.data?.find((group) => group.code === serviceType)?.id;
  const scopeId =
    scope === "CUSTOMER"
      ? customerId
      : scope === "CONTRACT"
        ? contractId
        : scope === "SERVICE_GROUP"
          ? groupId
          : null;
  const effectiveType = scope === "GLOBAL" ? "*" : serviceType;
  const overlap = useOverlapCheck({
    scope,
    scopeId,
    serviceType: effectiveType,
    validFrom: validFrom?.format("YYYY-MM-DD"),
    validTo: validTo ? validTo.format("YYYY-MM-DD") : null,
  });
  const overlapping = overlap.data && !overlap.data.ok ? overlap.data.conflicts : [];
  const steps = expectedApprovalSteps(scope, 0);

  useUnsavedChangesGuard(touched && !done);

  useEffect(() => {
    if (!done) return;
    navigate(`/pricing/${done.id}`, {
      replace: true,
      state: done.submitError ? { submitError: done.submitError } : undefined,
    });
  }, [done, navigate]);

  const changeGroup = (next: string | undefined, previous: string | undefined) => {
    const filled = lines.filter((line) => line.serviceCode);
    if (!previous || filled.length === 0 || scope === "GLOBAL") return;
    const foreign = filled.filter(
      (line) => services.data?.find((s) => s.code === line.serviceCode)?.groupCode !== next,
    );
    if (foreign.length === 0) return;
    modal.confirm({
      title: "Đổi nhóm dịch vụ?",
      content: `Đổi nhóm sẽ xóa ${foreign.length} dòng không thuộc nhóm mới.`,
      okText: "Đổi nhóm",
      cancelText: "Giữ nhóm cũ",
      onOk: () => setLines(lines.filter((line) => !foreign.includes(line))),
      onCancel: () => form.setFieldValue("serviceType", previous),
    });
  };

  const openNewVersion = async (code: string) => {
    if (!scope || !effectiveType) return;
    const id = await findPriceListIdByCode(code, scope, scopeId, effectiveType);
    if (id) navigate(`/pricing/${id}?newVersion=1`);
    else message.warning(`Could not open ${code} (it may belong to another department).`);
  };

  const save = async (andSubmit: boolean) => {
    setError(null);
    setProblems([]);
    setErrorCodes([]);
    let values: HeaderValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const lineIssues = lineProblems(lines);
    if (lineIssues.length > 0) {
      setProblems(lineIssues);
      return;
    }
    if (andSubmit && overlapping.length > 0) {
      message.error(
        "Overlapping effective period – cannot submit. Change the dates or create a new version.",
      );
      return;
    }
    create.resetKey();
    try {
      const created = await create.mutateAsync({
        scope: values.scope,
        scopeId: scopeId ?? null,
        serviceType: effectiveType!,
        name: values.name.trim(),
        currency: values.currency,
        validFrom: values.validFrom!.format("YYYY-MM-DD"),
        validTo: values.validTo ? values.validTo.format("YYYY-MM-DD") : null,
        note: values.note?.trim() || null,
        lines: toLineInputs(lines, services.data),
      });
      if (!andSubmit) {
        message.success(`Draft saved: ${created.code}`);
        setDone({ id: created.id });
        return;
      }
      submit.resetKey();
      try {
        await submit.mutateAsync(created.id);
        message.success(`Submitted for approval: ${created.code}`);
        setDone({ id: created.id });
      } catch (submitError) {
        setDone({ id: created.id, submitError: errorMessage(submitError) });
      }
    } catch (createError) {
      const code = errorCodeOf(createError);
      if (code === "PRC_SCOPE_TARGET_INVALID" || code === "PRC_SCOPE_INVALID") {
        form.setFields([
          {
            name:
              scope === "CONTRACT"
                ? "contractId"
                : scope === "CUSTOMER"
                  ? "customerId"
                  : "serviceType",
            errors: [errorMessage(createError)],
          },
        ]);
      } else if (code === "PRC_INVALID_RANGE") {
        form.setFields([{ name: "validTo", errors: [errorMessage(createError)] }]);
      } else if (code && LINE_ERROR_CODES.has(code)) {
        setErrorCodes(
          lineErrorCodes(
            createError,
            lines.map((line) => line.serviceCode),
          ),
        );
      }
      setError(createError);
    }
  };

  const contractRange = contract.data
    ? { from: dayjs(contract.data.effectiveFrom), to: dayjs(contract.data.effectiveTo) }
    : null;
  const disabledDate = (date: Dayjs) =>
    !!contractRange &&
    (date.isBefore(contractRange.from, "day") || date.isAfter(contractRange.to, "day"));

  const initialValues = useMemo<Partial<HeaderValues>>(
    () => ({
      scope: initialScope,
      customerId: initialScope === "CUSTOMER" ? params.get("scopeId") : undefined,
      contractId: initialScope === "CONTRACT" ? params.get("scopeId") : undefined,
      currency: "VND",
      validFrom: dayjs(todayIso()),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <>
      <PageHeader
        title="Tạo bảng giá"
        subtitle="Bảng giá mới ở trạng thái Nháp – gửi duyệt qua quy trình PRICE_LIST."
      />
      {error !== null && <ProblemAlert error={error} style={{ marginBottom: 16 }} />}
      {problems.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          title="Dòng giá chưa hợp lệ"
          description={
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          }
        />
      )}
      <Form<HeaderValues>
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={() => setTouched(true)}
      >
        <Card title="① Áp dụng cho" size="small" style={{ marginBottom: 16 }}>
          <Form.Item name="scope" label="Phạm vi" rules={[{ required: true }]}>
            <Radio.Group
              options={SCOPE_ORDER.map((value) => ({ value, label: SCOPE_META[value].label }))}
              onChange={() => form.setFieldsValue({ customerId: null, contractId: null })}
            />
          </Form.Item>
          {scope === "CUSTOMER" && (
            <Form.Item
              name="customerId"
              label="Khách hàng"
              rules={[{ required: true, message: "Select a customer" }]}
            >
              <CustomerSelect />
            </Form.Item>
          )}
          {scope === "CONTRACT" && (
            <Form.Item
              name="contractId"
              label="Hợp đồng"
              rules={[{ required: true, message: "Select a contract" }]}
              extra={
                contract.data
                  ? `Hiệu lực bảng giá phải nằm trong hiệu lực hợp đồng ${formatDate(contract.data.effectiveFrom)} – ${formatDate(contract.data.effectiveTo)}.`
                  : undefined
              }
            >
              <ContractSelect onlyOpen />
            </Form.Item>
          )}
          {scope !== "GLOBAL" ? (
            <Form.Item
              name="serviceType"
              label="Nhóm dịch vụ"
              rules={[{ required: true, message: "Chọn nhóm dịch vụ" }]}
            >
              <Select
                placeholder="Select a group"
                loading={groups.isLoading}
                options={(groups.data ?? []).map((group) => ({
                  value: group.code,
                  label: group.name,
                }))}
                onChange={(next: string) => changeGroup(next, serviceType)}
                style={{ maxWidth: 320 }}
              />
            </Form.Item>
          ) : (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              title="Bảng giá niêm yết toàn hệ thống (mọi nhóm dịch vụ) – cần Ban Giám đốc duyệt."
            />
          )}
          <PriorityExplainer />
        </Card>

        <Card title="② Thông tin" size="small" style={{ marginBottom: 16 }}>
          <Flex gap={16} wrap>
            <Form.Item
              name="name"
              label="Tên"
              rules={[{ required: true, whitespace: true, message: "Enter a price list name" }]}
              style={{ flex: 1, minWidth: 280 }}
            >
              <Input maxLength={255} placeholder="VD: Giá lưu bãi Biển Xanh 2027" />
            </Form.Item>
            <Form.Item name="currency" label="Tiền tệ">
              <Select
                options={[
                  { value: "VND", label: "VND" },
                  { value: "USD", label: "USD" },
                ]}
                style={{ width: 120 }}
              />
            </Form.Item>
          </Flex>
          <Flex gap={16} wrap>
            <Form.Item
              name="validFrom"
              label="Hiệu lực từ"
              rules={[{ required: true, message: "Select a date" }]}
            >
              <DatePicker format="DD/MM/YYYY" disabledDate={disabledDate} />
            </Form.Item>
            <Form.Item
              name="validTo"
              label="Đến (trống = không thời hạn)"
              dependencies={["validFrom"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value: Dayjs | null) =>
                    !value ||
                    !getFieldValue("validFrom") ||
                    !value.isBefore(getFieldValue("validFrom"), "day")
                      ? Promise.resolve()
                      : Promise.reject(new Error("End date must be after start date (PRC-02)")),
                }),
              ]}
            >
              <DatePicker format="DD/MM/YYYY" allowClear disabledDate={disabledDate} />
            </Form.Item>
          </Flex>
          {overlapping.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              data-testid="overlap-alert"
              title={`Trùng thời gian với ${overlapping.join(", ")}.`}
              description={
                <>
                  <div>
                    Mỗi đối tượng chỉ có một bảng giá hiệu lực tại một thời điểm. Bản nháp vẫn lưu
                    được, nhưng không gửi duyệt được.
                  </div>
                  <Space style={{ marginTop: 8 }} wrap>
                    <Button size="small" onClick={() => void openNewVersion(overlapping[0])}>
                      Tạo version mới từ {overlapping[0]}
                    </Button>
                    <Button size="small" type="link" onClick={() => form.focusField("validFrom")}>
                      Đổi ngày hiệu lực
                    </Button>
                  </Space>
                </>
              }
            />
          )}
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={1000} />
          </Form.Item>
        </Card>
      </Form>

      <Card
        title="③ Dòng giá"
        size="small"
        extra={
          scope !== "GLOBAL" && (
            <Checkbox
              checked={showReference}
              onChange={(event) => setShowReference(event.target.checked)}
            >
              Gợi ý giá niêm yết
            </Checkbox>
          )
        }
      >
        <PriceLinesEditor
          value={lines}
          onChange={(next) => {
            setLines(next);
            setTouched(true);
          }}
          scope={scope}
          serviceType={effectiveType}
          currency={currency}
          errorCodes={errorCodes}
          reference={reference}
        />
      </Card>

      <div className="pf-sticky-footer">
        <Flex justify="space-between" align="center" gap={12} wrap>
          <Typography.Text type="secondary">
            ⓘ Bảng giá sẽ qua: {steps.join(" → ")}
            {scope !== "GLOBAL" && " (thêm Ban Giám đốc nếu là version mới giảm giá > 10%)"} – dự
            kiến.
          </Typography.Text>
          <Space wrap>
            <Button onClick={() => navigate("/pricing")}>Hủy</Button>
            <Button
              loading={create.isPending && !submit.isPending}
              onClick={() => void save(false)}
            >
              Lưu nháp
            </Button>
            <Button
              type="primary"
              loading={create.isPending || submit.isPending}
              onClick={() => void save(true)}
              disabled={overlapping.length > 0}
            >
              Lưu &amp; gửi duyệt
            </Button>
          </Space>
        </Flex>
      </div>
    </>
  );
}

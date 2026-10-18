import { useMemo, useState } from "react";
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Flex,
  Form,
  InputNumber,
  Input,
  Row,
  Space,
  Steps,
  Table,
  Tooltip,
  Typography,
  type FormInstance,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";

import { usePermission } from "@/features/auth";
import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { useConflictModal } from "@/shared/components/feedback/useConflictModal";
import { daysFromToday, formatDate, formatMoney, todayIso } from "@/shared/lib/format";
import { isConflict } from "@/shared/lib/problem";

import type { AddendumResponse, AddendumType } from "../api/addenda";
import type { ContractResponse } from "../api/contracts";
import {
  useCreateAddendum,
  useCurrentPrices,
  useInvalidateAddendum,
  useSubmitAddendum,
  useUpdateAddendum,
} from "../hooks/useAddenda";
import { useServiceGroups, useServices } from "../hooks/useContracts";
import { addendumEligibility } from "../lib/addendumEligibility";
import { deltaPct, fromAddendum, toChanges, type AddendumDraft } from "../lib/addendumPayload";
import { ADDENDUM_TYPES, PAYMENT_METHODS, SCOPE_LABELS } from "../lib/labels";
import { AddendumChangesView } from "./AddendumChangesView";
import { ServicePickerModal } from "./ServicePickerModal";
import { ServicesTable } from "./ServicesTable";

interface Props {
  contract: ContractResponse;
  open: boolean;
  onClose(): void;
  initialType?: AddendumType;

  addendum?: AddendumResponse;
}

function defaultEffectiveFrom(type: AddendumType, contract: ContractResponse): string {
  const today = todayIso();
  if (type === "EXTENSION") return today;
  if (today < contract.effectiveFrom) return contract.effectiveFrom;
  if (today > contract.effectiveTo) return contract.effectiveTo;
  return today;
}

const TYPE_ORDER: AddendumType[] = [
  "PRICE_CHANGE",
  "EXTENSION",
  "PAYMENT_TERMS",
  "SERVICE_ADDITION",
];

export function AddendumDrawer({ contract, open, onClose, initialType, addendum }: Props) {
  const daysToEnd = daysFromToday(contract.effectiveTo);
  const firstEligible =
    initialType ??
    TYPE_ORDER.find((type) => addendumEligibility(type, contract.status, daysToEnd).allowed);
  const [step, setStep] = useState(addendum ? 1 : 0);
  const [type, setType] = useState<AddendumType | undefined>(addendum?.type ?? firstEligible);
  const [draft, setDraft] = useState<AddendumDraft | undefined>(
    addendum ? fromAddendum(addendum) : undefined,
  );
  const [error, setError] = useState<unknown>();
  const [form] = Form.useForm<Record<string, unknown>>();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={640}
      destroyOnHidden
      title={addendum ? `Sửa ${addendum.number}` : `Tạo phụ lục cho ${contract.number}`}
    >
      <Steps
        size="small"
        current={step}
        style={{ marginBottom: 24 }}
        items={[{ title: "Loại" }, { title: "Nội dung" }, { title: "Xem lại" }]}
      />
      {error !== undefined && <ProblemAlert error={error} style={{ marginBottom: 16 }} />}
      {step === 0 && (
        <TypeStep
          contract={contract}
          daysToEnd={daysToEnd}
          value={type}
          onChange={setType}
          onNext={() => {
            setError(undefined);
            if (!draft || draft.type !== type)
              setDraft({ type: type!, effectiveFrom: defaultEffectiveFrom(type!, contract) });
            setStep(1);
          }}
          onCancel={onClose}
        />
      )}
      {step === 1 && draft && (
        <ContentStep
          form={form}
          contract={contract}
          draft={draft}
          canBack={!addendum}
          onBack={() => setStep(0)}
          onNext={(next) => {
            setDraft(next);
            setStep(2);
          }}
        />
      )}
      {step === 2 && draft && (
        <ReviewStep
          contract={contract}
          draft={draft}
          addendum={addendum}
          onBack={() => setStep(1)}
          onError={setError}
          onDone={onClose}
        />
      )}
    </Drawer>
  );
}

function TypeStep({
  contract,
  daysToEnd,
  value,
  onChange,
  onNext,
  onCancel,
}: {
  contract: ContractResponse;
  daysToEnd: number;
  value: AddendumType | undefined;
  onChange(type: AddendumType): void;
  onNext(): void;
  onCancel(): void;
}) {
  const eligibility = (type: AddendumType) => addendumEligibility(type, contract.status, daysToEnd);
  return (
    <>
      <Row gutter={[12, 12]}>
        {TYPE_ORDER.map((type) => {
          const meta = ADDENDUM_TYPES[type];
          const check = eligibility(type);
          const card = (
            <Card
              size="small"
              hoverable={check.allowed}
              role="radio"
              aria-checked={value === type}
              aria-disabled={!check.allowed}
              aria-label={meta.label}
              onClick={() => check.allowed && onChange(type)}
              style={{
                height: "100%",
                cursor: check.allowed ? "pointer" : "not-allowed",
                opacity: check.allowed ? 1 : 0.5,
                borderColor: value === type ? "var(--pf-brand)" : undefined,
                boxShadow: value === type ? "0 0 0 1px var(--pf-brand)" : undefined,
              }}
            >
              <Typography.Text strong>
                {meta.icon} {meta.label}
              </Typography.Text>
              <Typography.Paragraph type="secondary" style={{ margin: "4px 0 0", fontSize: 13 }}>
                {check.allowed ? meta.description : `ⓘ ${check.reason}`}
              </Typography.Paragraph>
            </Card>
          );
          return (
            <Col key={type} xs={24} sm={12}>
              {check.allowed ? card : <Tooltip title={check.reason}>{card}</Tooltip>}
            </Col>
          );
        })}
      </Row>
      <Flex justify="flex-end" gap={8} style={{ marginTop: 24 }}>
        <Button onClick={onCancel}>Hủy</Button>
        <Button type="primary" disabled={!value || !eligibility(value).allowed} onClick={onNext}>
          Tiếp ›
        </Button>
      </Flex>
    </>
  );
}

function ContentStep({
  form,
  contract,
  draft,
  canBack,
  onBack,
  onNext,
}: {
  form: FormInstance<Record<string, unknown>>;
  contract: ContractResponse;
  draft: AddendumDraft;
  canBack: boolean;
  onBack(): void;
  onNext(draft: AddendumDraft): void;
}) {
  const services = useServices();
  const groups = useServiceGroups();
  const canReadPrices = usePermission("PriceList.Read");
  const [added, setAdded] = useState(draft.services ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const effectiveFrom = Form.useWatch("effectiveFrom", form) as Dayjs | undefined;
  const prices = Form.useWatch("prices", form) as Record<string, number | null> | undefined;
  const at = effectiveFrom ? effectiveFrom.format("YYYY-MM-DD") : draft.effectiveFrom;

  const activeServices = contract.services.filter(
    (line) => !line.validFrom || line.validFrom <= at,
  );
  const current = useCurrentPrices(
    contract.id,
    activeServices.map((line) => line.serviceCode),
    at,
    draft.type === "PRICE_CHANGE" && canReadPrices,
  );
  const currentPrices = useMemo(() => {
    const map: Record<string, { unitPrice: number; scope: string }> = {};
    for (const segment of current.data?.segments ?? []) {
      map[segment.serviceCode] = { unitPrice: Number(segment.unitPrice), scope: segment.scope };
    }
    return map;
  }, [current.data]);

  const isExtension = draft.type === "EXTENSION";
  const disabledDate = (date: Dayjs) =>
    !isExtension &&
    (date.isBefore(dayjs(contract.effectiveFrom), "day") ||
      date.isAfter(dayjs(contract.effectiveTo), "day"));

  const finish = (values: Record<string, unknown>) => {
    const next: AddendumDraft = {
      type: draft.type,
      effectiveFrom: (values.effectiveFrom as Dayjs).format("YYYY-MM-DD"),
      newEffectiveTo: (values.newEffectiveTo as Dayjs | undefined)?.format("YYYY-MM-DD"),
      paymentDays: values.paymentDays as number | undefined,
      paymentMethod: values.paymentMethod as string | undefined,
      paymentNote: values.paymentNote as string | undefined,
      prices: values.prices as Record<string, number | null> | undefined,
      services: added,
    };
    onNext(next);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={finish}
      initialValues={{
        effectiveFrom: dayjs(draft.effectiveFrom),
        newEffectiveTo: draft.newEffectiveTo ? dayjs(draft.newEffectiveTo) : undefined,
        paymentDays:
          draft.paymentDays ??
          contract.currentTerms?.paymentDays ??
          contract.paymentTerms.paymentDays,
        paymentMethod:
          draft.paymentMethod ??
          contract.currentTerms?.paymentMethod ??
          contract.paymentTerms.method,
        paymentNote: draft.paymentNote ?? "",
        prices: draft.prices ?? {},
      }}
    >
      <Form.Item
        name="effectiveFrom"
        label="Ngày hiệu lực"
        rules={[{ required: true, message: "Select an effective date" }]}
        extra={
          effectiveFrom
            ? effectiveFrom.format("YYYY-MM-DD") <= todayIso()
              ? "Áp dụng ngay khi được duyệt."
              : `Will be applied automatically on ${effectiveFrom.format("DD/MM/YYYY")}.`
            : undefined
        }
      >
        <DatePicker
          format="DD/MM/YYYY"
          disabledDate={disabledDate}
          style={{ width: "100%" }}
          aria-label="Ngày hiệu lực"
        />
      </Form.Item>

      {isExtension && (
        <>
          <Typography.Paragraph>
            Kết thúc hiện tại: <b>{formatDate(contract.effectiveTo)}</b>
          </Typography.Paragraph>
          <Form.Item
            name="newEffectiveTo"
            label="Ngày kết thúc mới"
            rules={[
              { required: true, message: "Select a new end date" },
              {
                validator: (_, value: Dayjs | undefined) =>
                  !value || value.isAfter(dayjs(contract.effectiveTo), "day")
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(`Must be after ${formatDate(contract.effectiveTo)}`),
                      ),
              },
            ]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              aria-label="Ngày kết thúc mới"
              disabledDate={(date) => !date.isAfter(dayjs(contract.effectiveTo), "day")}
            />
          </Form.Item>
          <Space style={{ marginTop: -12, marginBottom: 16 }}>
            {[
              { label: "+6 tháng", months: 6 },
              { label: "+1 năm", months: 12 },
            ].map((option) => (
              <Button
                key={option.label}
                size="small"
                onClick={() =>
                  form.setFieldValue(
                    "newEffectiveTo",
                    dayjs(contract.effectiveTo).add(option.months, "month"),
                  )
                }
              >
                {option.label}
              </Button>
            ))}
          </Space>
        </>
      )}

      {draft.type === "PAYMENT_TERMS" && (
        <Row gutter={16}>
          <Col xs={24} sm={10}>
            <Card size="small" title="Điều khoản hiện tại" style={{ marginBottom: 16 }}>
              <div>
                {contract.currentTerms?.paymentDays ?? contract.paymentTerms.paymentDays} ngày
              </div>
              <div>{contract.currentTerms?.paymentMethod ?? contract.paymentTerms.method}</div>
              <Typography.Text type="secondary">
                {contract.currentTerms?.paymentNote ?? contract.paymentTerms.note ?? ""}
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} sm={14}>
            <Form.Item
              name="paymentDays"
              label="Số ngày thanh toán"
              rules={[
                { required: true, message: "Enter a number of days" },
                { type: "number", min: 0, max: 365, message: "Must be between 0 and 365" },
              ]}
            >
              <InputNumber
                min={0}
                max={365}
                precision={0}
                style={{ width: "100%" }}
                aria-label="Số ngày thanh toán"
              />
            </Form.Item>
            <Form.Item
              name="paymentMethod"
              label="Phương thức"
              rules={[{ required: true, whitespace: true, message: "Select a method" }]}
            >
              <AutoComplete options={PAYMENT_METHODS} aria-label="Phương thức" />
            </Form.Item>
            <Form.Item name="paymentNote" label="Ghi chú">
              <Input />
            </Form.Item>
          </Col>
        </Row>
      )}

      {draft.type === "PRICE_CHANGE" && (
        <Form.Item
          label={`Đơn giá mới (${contract.value.currency}) – chỉ nhập dịch vụ cần đổi`}
          required
          name="pricesCheck"
          rules={[
            {
              validator: () =>
                Object.values((form.getFieldValue("prices") as Record<string, unknown>) ?? {}).some(
                  (value) => value !== null && value !== undefined,
                )
                  ? Promise.resolve()
                  : Promise.reject(new Error("Enter a new unit price for at least one service")),
            },
          ]}
        >
          <Table
            size="small"
            pagination={false}
            rowKey="serviceCode"
            dataSource={activeServices}
            columns={[
              {
                title: "Dịch vụ",
                dataIndex: "serviceCode",
                render: (code: string) => <Typography.Text code>{code}</Typography.Text>,
              },
              ...(canReadPrices
                ? [
                    {
                      title: "Đơn giá hiện hành",
                      key: "current",
                      render: (_: unknown, line: { serviceCode: string }) => {
                        const price = currentPrices[line.serviceCode];
                        if (current.isLoading) return "…";
                        return price ? (
                          <span>
                            {formatMoney(price.unitPrice, contract.value.currency)}
                            <br />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {SCOPE_LABELS[price.scope] ?? price.scope}
                            </Typography.Text>
                          </span>
                        ) : (
                          <Typography.Text type="secondary">Chưa có giá</Typography.Text>
                        );
                      },
                    },
                  ]
                : []),
              {
                title: "Đơn giá mới",
                key: "next",
                render: (_: unknown, line: { serviceCode: string }) => (
                  <Form.Item name={["prices", line.serviceCode]} noStyle>
                    <InputNumber
                      min={0}
                      precision={2}
                      style={{ width: 150 }}
                      aria-label={`Đơn giá mới ${line.serviceCode}`}
                    />
                  </Form.Item>
                ),
              },
              {
                title: "Chênh lệch",
                key: "delta",
                render: (_: unknown, line: { serviceCode: string }) => {
                  const delta = deltaPct(
                    currentPrices[line.serviceCode]?.unitPrice,
                    prices?.[line.serviceCode],
                  );
                  return delta === undefined ? (
                    "—"
                  ) : (
                    <Typography.Text type={delta < -10 ? "danger" : undefined}>
                      {delta > 0 ? "+" : ""}
                      {delta.toLocaleString("vi-VN")}%
                    </Typography.Text>
                  );
                },
              },
            ]}
          />
        </Form.Item>
      )}

      {draft.type === "SERVICE_ADDITION" && (
        <Form.Item
          label="Dịch vụ thêm"
          required
          name="servicesCheck"
          rules={[
            {
              validator: () =>
                added.length
                  ? Promise.resolve()
                  : Promise.reject(new Error("Select at least one service")),
            },
          ]}
        >
          <ServicesTable
            rows={added}
            catalog={services.data ?? []}
            groups={groups.data ?? []}
            onChange={setAdded}
          />
          <Button
            icon={<PlusOutlined />}
            style={{ marginTop: 8 }}
            onClick={() => setPickerOpen(true)}
          >
            Chọn dịch vụ
          </Button>
          <ServicePickerModal
            open={pickerOpen}
            services={services.data ?? []}
            groups={groups.data ?? []}
            excludeCodes={[
              ...contract.services.map((line) => line.serviceCode),
              ...added.map((row) => row.serviceCode),
            ]}
            onCancel={() => setPickerOpen(false)}
            onSelect={(picked) => {
              setAdded((rows) => [
                ...rows,
                ...picked.map((service) => ({
                  serviceCode: service.code,
                  mandatory: service.mandatoryDefault,
                })),
              ]);
              setPickerOpen(false);
            }}
          />
        </Form.Item>
      )}

      <Flex justify="space-between" style={{ marginTop: 24 }}>
        {canBack ? <Button onClick={onBack}>‹ Quay lại</Button> : <span />}
        <Button type="primary" htmlType="submit">
          Xem lại ›
        </Button>
      </Flex>
    </Form>
  );
}

function ReviewStep({
  contract,
  draft,
  addendum,
  onBack,
  onError,
  onDone,
}: {
  contract: ContractResponse;
  draft: AddendumDraft;
  addendum?: AddendumResponse;
  onBack(): void;
  onError(error: unknown): void;
  onDone(): void;
}) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const showConflict = useConflictModal();
  const services = useServices();
  const canReadPrices = usePermission("PriceList.Read");
  const create = useCreateAddendum();
  const update = useUpdateAddendum();
  const submit = useSubmitAddendum();
  const invalidate = useInvalidateAddendum();
  const current = useCurrentPrices(
    contract.id,
    Object.keys(draft.prices ?? {}),
    draft.effectiveFrom,
    draft.type === "PRICE_CHANGE" && canReadPrices,
  );
  const currentPrices = Object.fromEntries(
    (current.data?.segments ?? []).map((segment) => [
      segment.serviceCode,
      { unitPrice: Number(segment.unitPrice), scope: segment.scope },
    ]),
  );
  const [savedId, setSavedId] = useState<string | undefined>(addendum?.id);

  const save = async (): Promise<AddendumResponse | undefined> => {
    onError(undefined);
    const body = {
      type: draft.type,
      effectiveFrom: draft.effectiveFrom,
      changes: toChanges(draft, contract.value.currency),
    };
    try {
      if (addendum)
        return await update.mutateAsync({ id: addendum.id, version: addendum.version, body });
      if (savedId) return undefined;
      create.resetKey();
      return await create.mutateAsync({ contractId: contract.id, body });
    } catch (error) {
      if (isConflict(error)) showConflict(error, onDone);
      else onError(error);
      return undefined;
    }
  };

  const finish = (id: string, text: string) => {
    invalidate(id, contract.id);
    message.success(text);
    onDone();
    navigate(`/addenda/${id}`);
  };

  const saveDraft = async () => {
    const result = await save();
    if (result) finish(result.id, `Draft saved: ${result.number}`);
  };

  const saveAndSubmit = async () => {
    const result = await save();
    const id = result?.id ?? savedId;
    if (!id) return;
    setSavedId(id);
    try {
      submit.resetKey();
      const response = await submit.mutateAsync(id);
      const holder = response.workflow.currentStep?.assignees
        .map((person) => person.fullName)
        .join(", ");
      finish(
        id,
        holder
          ? `Submitted for approval – waiting for ${holder}`
          : "Addendum submitted for approval",
      );
    } catch (error) {
      onError(error);
    }
  };

  const busy = create.isPending || update.isPending || submit.isPending;
  return (
    <>
      <AddendumChangesView
        draft={draft}
        contract={contract}
        catalog={services.data}
        currentPrices={currentPrices}
      />
      {savedId && !addendum && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 12 }}
          title="Addendum saved as draft – click again to submit for approval."
        />
      )}
      <Flex justify="space-between" style={{ marginTop: 24 }} gap={8} wrap>
        <Button onClick={onBack} disabled={busy}>
          ‹ Quay lại
        </Button>
        <Space>
          <Button
            onClick={() => void saveDraft()}
            loading={create.isPending || update.isPending}
            disabled={!!savedId && !addendum}
          >
            Lưu nháp
          </Button>
          <Button type="primary" onClick={() => void saveAndSubmit()} loading={submit.isPending}>
            Lưu & gửi duyệt
          </Button>
        </Space>
      </Flex>
    </>
  );
}

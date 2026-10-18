import { useMemo, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Dropdown,
  Form,
  Radio,
  Segmented,
  Space,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import { MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import { DocumentHeader } from "@/shared/components/document/DocumentHeader";
import { DocumentLayout } from "@/shared/components/document/DocumentLayout";
import { useConflictModal } from "@/shared/components/feedback/useConflictModal";
import { StatusTag } from "@/shared/components/status/StatusTag";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { formatDateTime } from "@/shared/lib/format";
import { errorCodeOf, errorMessage, fieldErrorsOf, isConflict } from "@/shared/lib/problem";
import { documentTypeLabel } from "@/shared/lib/statusLabels";

import {
  fetchDefinition,
  type DefinitionContent,
  type DefinitionResponse,
  type ResubmitPolicy,
  type StepDefinition,
  type Violation,
} from "../api/definitions";
import {
  definitionKeys,
  useCloneDefinition,
  useDefinitions,
  useUpdateDefinition,
  useValidateDefinition,
} from "../hooks/useDefinitions";
import { RESUBMIT_LABELS } from "../lib/labels";
import {
  duplicateStep,
  MAX_STEPS,
  moveStep,
  newStep,
  normalizeContent,
  parseJson,
  removeStep,
  renumber,
  toJson,
} from "../lib/steps";
import { violationsFromProblem, violationsOfStep } from "../lib/violationPath";
import { ActivateModal } from "./ActivateModal";
import { FlowPreview } from "./FlowPreview";
import { JsonEditor } from "./JsonEditor";
import { SimulationPanel } from "./SimulationPanel";
import { StepEditorCard } from "./StepEditorCard";
import { ValidationPanel } from "./ValidationPanel";
import { VersionHistoryDrawer } from "./VersionHistoryDrawer";

type Mode = "form" | "json";

interface Props {
  definition: DefinitionResponse;
}

function snapshot(content: DefinitionContent, effectiveFrom: string | null) {
  return JSON.stringify({ content, effectiveFrom });
}

export function WorkflowEditor({ definition }: Props) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showConflict = useConflictModal();
  const readOnly = definition.status !== "DRAFT";

  const [content, setContent] = useState<DefinitionContent>(() =>
    normalizeContent(definition.definition),
  );
  const [effectiveFrom, setEffectiveFrom] = useState<string | null>(definition.effectiveFrom);
  const [saved, setSaved] = useState(() =>
    snapshot(normalizeContent(definition.definition), definition.effectiveFrom),
  );
  const [mode, setMode] = useState<Mode>("form");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [violations, setViolations] = useState<Violation[] | null>(
    definition.warnings.length > 0 ? definition.warnings : null,
  );
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState("check");
  const [flashStep, setFlashStep] = useState<number | null>(null);
  const [activateOpen, setActivateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const update = useUpdateDefinition(definition.id);
  const validate = useValidateDefinition(definition.id);
  const clone = useCloneDefinition();
  const all = useDefinitions();

  const dirty = !readOnly && snapshot(content, effectiveFrom) !== saved;
  useUnsavedChangesGuard(dirty);

  const versions = useMemo(
    () => (all.data ?? []).filter((item) => item.documentType === definition.documentType),
    [all.data, definition.documentType],
  );
  const currentActive = versions.find(
    (item) => item.status === "ACTIVE" && item.id !== definition.id,
  );
  const hasV7 = (violations ?? []).some((violation) => violation.rule === "V7");
  const errorCount = (violations ?? []).filter(
    (violation) => violation.severity === "ERROR",
  ).length;

  const setSteps = (steps: StepDefinition[]) => setContent((current) => ({ ...current, steps }));

  const reloadFromServer = async () => {
    const fresh = await fetchDefinition(definition.id);
    queryClient.setQueryData(definitionKeys.one(definition.id), fresh);
    const normalized = normalizeContent(fresh.definition);
    setContent(normalized);
    setEffectiveFrom(fresh.effectiveFrom);
    setSaved(snapshot(normalized, fresh.effectiveFrom));
    setJsonText(toJson(normalized));
    setJsonError(null);
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (next === "json") {
      setJsonText(toJson(content));
      setJsonError(null);
      setMode("json");
      return;
    }
    const parsed = parseJson(jsonText);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      message.error("Invalid JSON – fix the errors before switching back to Form.");
      return;
    }
    setContent(parsed.content);
    setMode("form");
  };

  const onJsonChange = (text: string) => {
    setJsonText(text);
    const parsed = parseJson(text);
    if (parsed.ok) {
      setJsonError(null);
      setContent(parsed.content);
    } else {
      setJsonError(parsed.error);
    }
  };

  const save = async (): Promise<boolean> => {
    if (mode === "json" && jsonError) {
      message.error("Invalid JSON – cannot save.");
      return false;
    }
    const payload = { ...content, steps: renumber(content.steps) };
    try {
      const result = await update.mutateAsync({ content: payload, effectiveFrom });
      const normalized = normalizeContent(result.definition);
      setContent(normalized);
      setSaved(snapshot(normalized, result.effectiveFrom));
      setViolations(result.warnings);
      setCheckedAt(new Date().toISOString());
      message.success(
        result.warnings.length > 0
          ? `Draft saved (${result.warnings.length} warnings).`
          : "Draft saved.",
      );
      return true;
    } catch (error) {
      if (errorCodeOf(error) === "WF_DEFINITION_INVALID") {
        setViolations(violationsFromProblem(fieldErrorsOf(error)));
        setCheckedAt(new Date().toISOString());
        setSideTab("check");
        message.error("Definition is invalid – see the “Kiểm tra” panel.");
      } else if (isConflict(error) || errorCodeOf(error) === "WF_DEFINITION_NOT_EDITABLE") {
        showConflict(error, () => void reloadFromServer());
      } else {
        message.error(errorMessage(error));
      }
      return false;
    }
  };

  const runValidate = async () => {
    if (dirty && !(await save())) return;
    validate.mutate(undefined, {
      onSuccess: (result) => {
        setViolations(result.violations);
        setCheckedAt(new Date().toISOString());
        setSideTab("check");
      },
      onError: (error) => message.error(errorMessage(error)),
    });
  };

  const cloneThis = () => {
    clone.resetKey();
    clone.mutate(definition.id, {
      onSuccess: (draft) => navigate(`/admin/workflows/${draft.id}`),
      onError: (error) => message.error(errorMessage(error)),
    });
  };

  const jumpTo = (stepIndex: number) => {
    if (mode === "json") switchMode("form");
    setFlashStep(stepIndex);
    requestAnimationFrame(() =>
      document
        .getElementById(`wf-step-${stepIndex}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    window.setTimeout(() => setFlashStep(null), 1600);
  };

  const exportJson = () => {
    const blob = new Blob([toJson(content)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workflow-${definition.documentType}-v${definition.version}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    const parsed = parseJson(await file.text());
    if (!parsed.ok) {
      message.error(parsed.error);
      return;
    }
    if (parsed.content.documentType && parsed.content.documentType !== definition.documentType) {
      message.warning(
        `Tệp là quy trình ${parsed.content.documentType} – đã đổi về ${definition.documentType} của bản nháp này.`,
      );
    }
    const content = { ...parsed.content, documentType: definition.documentType };
    setContent(content);
    setJsonText(toJson(content));
    message.success("JSON imported – review it, then click “Lưu”.");
  };

  const menuItems = [
    { key: "copy", label: "Sao chép JSON" },
    { key: "download", label: "Tải JSON" },
    ...(readOnly ? [] : [{ key: "import", label: "Nhập JSON từ tệp" }]),
    { key: "history", label: "Lịch sử version" },
    ...(definition.status === "RETIRED"
      ? [{ key: "reactivate", label: "Kích hoạt lại version này" }]
      : []),
  ];

  const onMenu = ({ key }: { key: string }) => {
    if (key === "copy") {
      void navigator.clipboard
        ?.writeText(toJson(content))
        .then(() => message.success("JSON copied."));
    } else if (key === "download") exportJson();
    else if (key === "import") fileInput.current?.click();
    else if (key === "history") setHistoryOpen(true);
    else if (key === "reactivate") setActivateOpen(true);
  };

  const actions = (
    <>
      <Segmented
        aria-label="Chế độ soạn"
        value={mode}
        onChange={(value) => switchMode(value as Mode)}
        options={[
          { value: "form", label: "Form" },
          { value: "json", label: "JSON" },
        ]}
      />
      {readOnly ? (
        <Button type="primary" loading={clone.isPending} onClick={cloneThis}>
          Tạo bản nháp từ version này
        </Button>
      ) : (
        <>
          <Button loading={validate.isPending} onClick={() => void runValidate()}>
            Kiểm tra
          </Button>
          <Button
            type={dirty ? "primary" : "default"}
            loading={update.isPending}
            onClick={() => void save()}
          >
            Lưu
          </Button>
          <Tooltip
            title={
              dirty
                ? "Lưu thay đổi trước khi kích hoạt"
                : hasV7
                  ? "No module handles this document type yet"
                  : undefined
            }
          >
            <Button disabled={dirty || hasV7} onClick={() => setActivateOpen(true)}>
              Kích hoạt…
            </Button>
          </Tooltip>
        </>
      )}
      <Dropdown menu={{ items: menuItems, onClick: onMenu }}>
        <Button aria-label="Thêm thao tác" icon={<MoreOutlined />} />
      </Dropdown>
    </>
  );

  const general = (
    <Card size="small" title="Cài đặt chung" style={{ marginBottom: 16 }}>
      <Form layout="vertical" disabled={readOnly}>
        <Form.Item label="Khi gửi lại sau yêu cầu sửa" style={{ marginBottom: 12 }}>
          <Radio.Group
            value={content.resubmitPolicy}
            onChange={(event) =>
              setContent((current) => ({
                ...current,
                resubmitPolicy: event.target.value as ResubmitPolicy,
              }))
            }
          >
            <Space orientation="vertical">
              <Radio value="RESTART">{RESUBMIT_LABELS.RESTART} (khuyến nghị)</Radio>
              <Radio value="RESUME_AT_REQUESTER">{RESUBMIT_LABELS.RESUME_AT_REQUESTER}</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label="Khi duyệt xong"
          extra="Signing only applies when the document type also has “cần ký” enabled (Admin › Document types)."
          style={{ marginBottom: 12 }}
        >
          <Checkbox
            checked={content.onFinalApprove.emitESign}
            onChange={(event) =>
              setContent((current) => ({
                ...current,
                onFinalApprove: { emitESign: event.target.checked },
              }))
            }
          >
            Phát yêu cầu ký điện tử
          </Checkbox>
        </Form.Item>
        <Form.Item
          label="Ngày hiệu lực (ghi chú)"
          extra="Chỉ để ghi chú – kích hoạt có hiệu lực ngay (07 Q7)."
          style={{ marginBottom: 0 }}
        >
          <DatePicker
            format="DD/MM/YYYY"
            value={effectiveFrom ? dayjs(effectiveFrom) : null}
            onChange={(value) => setEffectiveFrom(value ? value.format("YYYY-MM-DD") : null)}
          />
        </Form.Item>
      </Form>
    </Card>
  );

  const stepsEditor = (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Typography.Text strong>Các bước (dùng ↑/↓ để đổi thứ tự)</Typography.Text>
      {content.steps.map((step, index) => (
        <StepEditorCard
          key={index}
          step={step}
          index={index}
          total={content.steps.length}
          documentType={definition.documentType}
          readOnly={readOnly}
          highlighted={flashStep === index}
          violations={violationsOfStep(violations ?? [], index)}
          onChange={(next) => setSteps(content.steps.map((item, i) => (i === index ? next : item)))}
          onMove={(delta) => setSteps(moveStep(content.steps, index, delta))}
          onDuplicate={() => setSteps(duplicateStep(content.steps, index))}
          onRemove={() => setSteps(removeStep(content.steps, index))}
        />
      ))}
      {!readOnly && (
        <Button
          icon={<PlusOutlined />}
          block
          type="dashed"
          disabled={content.steps.length >= MAX_STEPS}
          onClick={() => setSteps([...content.steps, newStep(content.steps.length + 1)])}
        >
          Thêm bước {content.steps.length >= MAX_STEPS ? `(tối đa ${MAX_STEPS})` : ""}
        </Button>
      )}
    </Space>
  );

  const side = (
    <Card size="small">
      <Tabs
        activeKey={sideTab}
        onChange={setSideTab}
        size="small"
        items={[
          {
            key: "check",
            label: `Kiểm tra${violations && violations.length > 0 ? ` (${violations.length})` : ""}`,
            children: (
              <ValidationPanel
                violations={violations}
                checkedAt={checkedAt}
                steps={content.steps}
                loading={validate.isPending}
                onRecheck={readOnly ? undefined : () => void runValidate()}
                onJump={jumpTo}
              />
            ),
          },
          {
            key: "simulate",
            label: "Mô phỏng",
            children: (
              <SimulationPanel
                definitionId={definition.id}
                documentType={definition.documentType}
                dirty={dirty}
                onSave={save}
              />
            ),
          },
          { key: "flow", label: "Sơ đồ", children: <FlowPreview steps={content.steps} /> },
        ]}
      />
    </Card>
  );

  return (
    <>
      <DocumentHeader
        backTo={{ path: "/admin/workflows", label: "Quy trình duyệt" }}
        title={`${documentTypeLabel(definition.documentType)} · v${definition.version}`}
        tags={
          <>
            <StatusTag kind="WORKFLOW_DEFINITION" status={definition.status} />
            {dirty && <Typography.Text type="warning">• chưa lưu</Typography.Text>}
          </>
        }
        subtitle={
          definition.status === "ACTIVE"
            ? `Kích hoạt ${formatDateTime(definition.activatedAt)}`
            : `Sửa lần cuối ${formatDateTime(definition.updatedAt ?? definition.createdAt)}`
        }
        actions={actions}
      />
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        data-testid="import-json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importJson(file);
          event.target.value = "";
        }}
      />
      {readOnly && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={
            definition.status === "ACTIVE"
              ? "Đây là version đang áp dụng – không sửa trực tiếp."
              : `Version này đã ngừng áp dụng${definition.updatedAt ? ` từ ${formatDateTime(definition.updatedAt)}` : ""}.`
          }
          description="Documents already submitted keep using the version from submission time. To make changes, create a draft from this version and activate it."
          action={
            <Button size="small" loading={clone.isPending} onClick={cloneThis}>
              Tạo bản nháp từ version này
            </Button>
          }
        />
      )}
      {!readOnly && hasV7 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title="No module handles this document type – cannot activate (V7)."
        />
      )}
      {!readOnly && errorCount > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${errorCount} error(s) remaining – see the validation panel.`}
        />
      )}
      <DocumentLayout
        main={
          mode === "json" ? (
            <JsonEditor
              value={jsonText}
              onChange={onJsonChange}
              error={jsonError}
              readOnly={readOnly}
            />
          ) : (
            <>
              {general}
              {stepsEditor}
            </>
          )
        }
        side={side}
      />
      {activateOpen && (
        <ActivateModal
          definition={definition}
          currentActive={currentActive}
          onClose={() => setActivateOpen(false)}
        />
      )}
      <VersionHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        versions={versions.length > 0 ? versions : [definition]}
        current={{ ...definition, definition: content }}
      />
    </>
  );
}

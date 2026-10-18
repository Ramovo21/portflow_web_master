import { useMemo, useState } from "react";
import { App, Button, Skeleton } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { PageHeader } from "@/shared/components/page/PageHeader";
import { errorMessage } from "@/shared/lib/problem";
import { documentTypeLabel } from "@/shared/lib/statusLabels";

import type { DefinitionResponse } from "../workflows/api/definitions";
import { CreateDefinitionModal } from "../workflows/components/CreateDefinitionModal";
import { DefinitionCard } from "../workflows/components/DefinitionCard";
import {
  useCloneDefinition,
  useCreateDefinition,
  useDefinitions,
  useDocumentTypes,
} from "../workflows/hooks/useDefinitions";
import { templateDefinition } from "../workflows/lib/steps";

export function WorkflowDesignerPage() {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const definitions = useDefinitions();
  const documentTypes = useDocumentTypes();
  const create = useCreateDefinition();
  const clone = useCloneDefinition();
  const [creating, setCreating] = useState(false);

  const groups = useMemo(() => {
    const names = new Map<string, string>();
    for (const type of documentTypes.data ?? []) names.set(type.code, type.name);
    const byType = new Map<string, DefinitionResponse[]>();
    for (const type of documentTypes.data ?? []) byType.set(type.code, []);
    for (const definition of definitions.data ?? []) {
      byType.set(definition.documentType, [
        ...(byType.get(definition.documentType) ?? []),
        definition,
      ]);
    }
    return [...byType.entries()]
      .map(([code, versions]) => ({
        code,
        name: names.get(code) ?? documentTypeLabel(code),
        versions,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [definitions.data, documentTypes.data]);

  const confirmIfDraftExists = (documentType: string, proceed: () => void) => {
    const draft = groups
      .find((group) => group.code === documentType)
      ?.versions.find((v) => v.status === "DRAFT");
    if (!draft) return proceed();
    modal.confirm({
      title: `This document type already has a draft v${draft.version}`,
      content: "Mở bản nháp đó thay vì tạo thêm?",
      okText: "Mở bản nháp",
      cancelText: "Vẫn tạo mới",
      onOk: () => navigate(`/admin/workflows/${draft.id}`),
      onCancel: proceed,
    });
  };

  const createBlank = (documentType: string) =>
    confirmIfDraftExists(documentType, () => {
      create.resetKey();
      create.mutate(
        { content: templateDefinition(documentType), effectiveFrom: null },
        {
          onSuccess: (saved) => {
            setCreating(false);
            navigate(`/admin/workflows/${saved.id}`);
          },
          onError: (error) => message.error(errorMessage(error)),
        },
      );
    });

  const cloneFrom = (definition: DefinitionResponse) =>
    confirmIfDraftExists(definition.documentType, () => {
      clone.resetKey();
      clone.mutate(definition.id, {
        onSuccess: (saved) => navigate(`/admin/workflows/${saved.id}`),
        onError: (error) => message.error(errorMessage(error)),
      });
    });

  return (
    <>
      <PageHeader
        title="Quy trình duyệt"
        subtitle="Mỗi loại hồ sơ có một quy trình đang áp dụng. Sửa = tạo bản nháp version mới."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
            Tạo quy trình mới
          </Button>
        }
      />
      {definitions.isError && (
        <ProblemAlert error={definitions.error} style={{ marginBottom: 16 }} />
      )}
      {definitions.isLoading ? (
        <Skeleton active />
      ) : (
        groups.map((group) => (
          <DefinitionCard
            key={group.code}
            documentType={group.code}
            name={group.name}
            versions={group.versions}
            busy={create.isPending || clone.isPending}
            onCloneFrom={cloneFrom}
            onCreateBlank={createBlank}
          />
        ))
      )}
      {creating && (
        <CreateDefinitionModal
          loading={create.isPending}
          options={groups.map((group) => ({ code: group.code, name: group.name }))}
          onCancel={() => setCreating(false)}
          onCreate={createBlank}
        />
      )}
    </>
  );
}

import { Result, Skeleton } from "antd";
import { Link, useParams } from "react-router-dom";

import { ProblemAlert } from "@/shared/components/feedback/ProblemAlert";
import { statusOf } from "@/shared/lib/problem";

import { WorkflowEditor } from "../workflows/components/WorkflowEditor";
import { useDefinition } from "../workflows/hooks/useDefinitions";

export function WorkflowDefinitionPage() {
  const { id } = useParams();
  const definition = useDefinition(id);

  if (definition.isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (definition.isError) {
    return statusOf(definition.error) === 404 ? (
      <Result
        status="404"
        title="Workflow definition not found"
        extra={<Link to="/admin/workflows">Về danh sách quy trình</Link>}
      />
    ) : (
      <ProblemAlert error={definition.error} />
    );
  }

  return <WorkflowEditor key={definition.data!.id} definition={definition.data!} />;
}

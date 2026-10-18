import { useEffect, useState } from "react";
import { App, Skeleton } from "antd";
import { Navigate, useParams } from "react-router-dom";

import { PageHeader } from "@/shared/components/page/PageHeader";
import { StatusTag } from "@/shared/components/status/StatusTag";

import { ContractForm } from "../components/ContractForm";
import { LoadErrorResult } from "../components/NotFoundResult";
import { useContract } from "../hooks/useContracts";

export function EditContractPage() {
  const { id } = useParams();
  const { message } = App.useApp();
  const query = useContract(id);

  const [reloads, setReloads] = useState(0);
  const editable = query.data?.allowedActions.includes("UPDATE");

  useEffect(() => {
    if (query.data && !editable)
      message.warning(
        "A contract can only be edited when it is a Draft or has a revision requested.",
      );
  }, [query.data, editable, message]);

  if (query.isLoading) return <Skeleton active />;
  if (query.isError)
    return (
      <LoadErrorResult error={query.error} backTo="/contracts" backLabel="Về danh sách hợp đồng" />
    );
  const contract = query.data!;
  if (!editable) return <Navigate to={`/contracts/${contract.id}`} replace />;

  return (
    <>
      <PageHeader
        title={
          <>
            Sửa {contract.number} <StatusTag kind="CONTRACT" status={contract.status} />
          </>
        }
        subtitle={`${contract.customerName ?? ""} · rev ${contract.revision}`}
      />
      <ContractForm
        key={`${contract.id}-${reloads}`}
        contract={contract}
        onReload={() => void query.refetch().then(() => setReloads((count) => count + 1))}
      />
    </>
  );
}

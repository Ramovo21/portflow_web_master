import { useSearchParams } from "react-router-dom";

import { PageHeader } from "@/shared/components/page/PageHeader";

import { ContractForm } from "../components/ContractForm";

export function CreateContractPage() {
  const [params] = useSearchParams();
  return (
    <>
      <PageHeader
        title="Tạo hợp đồng"
        subtitle="Soạn hợp đồng nháp; đủ điều kiện thì gửi duyệt ngay."
      />
      <ContractForm presetCustomerId={params.get("customerId") ?? undefined} />
    </>
  );
}

import { useState } from "react";
import { Select } from "antd";

import {
  useContractSearch,
  useContractTarget,
  useCustomerSearch,
  useCustomerTarget,
} from "../hooks/usePricing";
import type { ContractOption } from "../api/targets";

interface CustomerProps {
  value?: string | null;
  onChange?(value: string | null): void;
  disabled?: boolean;
}

export function CustomerSelect({ value, onChange, disabled }: CustomerProps) {
  const [q, setQ] = useState("");
  const search = useCustomerSearch(q);
  const selected = useCustomerTarget(value);
  const options = (search.data ?? []).map((customer) => ({
    value: customer.id,
    label: `${customer.name} – ${customer.taxCode}`,
  }));
  if (selected.data && !options.some((option) => option.value === selected.data.id)) {
    options.unshift({
      value: selected.data.id,
      label: `${selected.data.name} – ${selected.data.taxCode}`,
    });
  }
  return (
    <Select
      showSearch={{ filterOption: false, onSearch: setQ }}
      value={value ?? undefined}
      onChange={(next) => onChange?.(next ?? null)}
      disabled={disabled}
      loading={search.isFetching}
      options={options}
      placeholder="Tìm tên, mã, MST khách hàng…"
      allowClear
      aria-label="Khách hàng"
      notFoundContent={search.isFetching ? "Searching…" : "No matching active customers"}
    />
  );
}

interface ContractProps {
  value?: string | null;
  onChange?(value: string | null, contract?: ContractOption): void;
  disabled?: boolean;

  onlyOpen?: boolean;
}

const OPEN_STATUSES = new Set([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "REVISION_REQUESTED",
  "APPROVED",
  "ACTIVE",
]);

export function ContractSelect({ value, onChange, disabled, onlyOpen }: ContractProps) {
  const [q, setQ] = useState("");
  const search = useContractSearch(q);
  const selected = useContractTarget(value);
  const found = (search.data ?? []).filter(
    (contract) => !onlyOpen || OPEN_STATUSES.has(contract.status),
  );
  const options = found.map((contract) => ({
    value: contract.id,
    label: `${contract.number} – ${contract.title}${contract.customerName ? ` · ${contract.customerName}` : ""}`,
  }));
  if (selected.data && !options.some((option) => option.value === selected.data.id)) {
    options.unshift({
      value: selected.data.id,
      label: `${selected.data.number} – ${selected.data.title}${selected.data.customerName ? ` · ${selected.data.customerName}` : ""}`,
    });
  }
  return (
    <Select
      showSearch={{ filterOption: false, onSearch: setQ }}
      value={value ?? undefined}
      onChange={(next) =>
        onChange?.(
          next ?? null,
          found.find((contract) => contract.id === next) ?? selected.data ?? undefined,
        )
      }
      disabled={disabled}
      loading={search.isFetching}
      options={options}
      placeholder="Tìm số hợp đồng, tiêu đề…"
      allowClear
      aria-label="Hợp đồng"
      notFoundContent={search.isFetching ? "Searching…" : "No matching contracts"}
    />
  );
}

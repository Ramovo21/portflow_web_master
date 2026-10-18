import { useState } from "react";
import { Select, type SelectProps } from "antd";
import { useQuery } from "@tanstack/react-query";

import { fetchCustomers } from "../api/customers";

interface Props extends Omit<
  SelectProps<string>,
  "options" | "onSearch" | "showSearch" | "filterOption"
> {
  activeOnly?: boolean;
}

export function CustomerSelect({ activeOnly = true, ...props }: Props) {
  const [q, setQ] = useState("");
  const query = useQuery({
    queryKey: ["customers", { q, status: activeOnly ? "ACTIVE" : undefined, page: 0, size: 20 }],
    queryFn: () =>
      fetchCustomers({
        q: q || undefined,
        status: activeOnly ? "ACTIVE" : undefined,
        page: 0,
        size: 20,
      }),
  });
  return (
    <Select
      showSearch={{ filterOption: false, onSearch: setQ }}
      placeholder="Tìm theo tên, mã KH hoặc MST"
      loading={query.isFetching}
      notFoundContent={query.isFetching ? "Searching…" : "No matching customers"}
      options={query.data?.items.map((item) => ({
        value: item.id,
        label: `${item.code} · ${item.name} · ${item.taxCode}`,
      }))}
      {...props}
    />
  );
}

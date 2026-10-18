import { useState } from "react";
import { Alert, Empty, Flex, Select, Skeleton, Table, Typography } from "antd";

import { formatDateTime } from "@/shared/lib/format";
import { errorMessage } from "@/shared/lib/problem";

import type { FieldChange } from "../api/contracts";
import { useContractVersions, useVersionDiff } from "../hooks/useContracts";
import { diffPathLabel, diffValue } from "../lib/diffLabels";

export function VersionsTab({ contractId }: { contractId: string }) {
  const versions = useContractVersions(contractId);
  const list = versions.data ?? [];
  const [picked, setPicked] = useState<{ from?: number; to?: number }>({});
  const from = picked.from ?? (list.length >= 2 ? list[list.length - 2].revision : undefined);
  const to = picked.to ?? (list.length >= 2 ? list[list.length - 1].revision : undefined);
  const diff = useVersionDiff(contractId, from, to);

  if (versions.isLoading) return <Skeleton active />;
  if (list.length === 0) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Not submitted for approval yet." />
    );
  }
  const options = list.map((version) => ({
    value: version.revision,
    label: `rev ${version.revision} · ${formatDateTime(version.submittedAt)}`,
  }));

  return (
    <>
      <Table
        size="small"
        pagination={false}
        rowKey="revision"
        dataSource={list}
        style={{ marginBottom: 16 }}
        columns={[
          { title: "Revision", dataIndex: "revision", render: (value: number) => `rev ${value}` },
          {
            title: "Ngày gửi",
            dataIndex: "submittedAt",
            render: (value: string) => formatDateTime(value),
          },
        ]}
      />
      {list.length < 2 ? (
        <Typography.Text type="secondary">Cần ít nhất 2 lần gửi duyệt để so sánh.</Typography.Text>
      ) : (
        <>
          <Flex gap={8} align="center" wrap style={{ marginBottom: 12 }}>
            <Typography.Text strong>So sánh</Typography.Text>
            <Select
              aria-label="Từ revision"
              value={from}
              options={options}
              style={{ minWidth: 200 }}
              onChange={(value) => setPicked((current) => ({ ...current, from: value }))}
            />
            →
            <Select
              aria-label="Đến revision"
              value={to}
              options={options}
              style={{ minWidth: 200 }}
              onChange={(value) => setPicked((current) => ({ ...current, to: value }))}
            />
          </Flex>
          {from === to ? (
            <Typography.Text type="secondary">Chọn hai revision khác nhau.</Typography.Text>
          ) : diff.isError ? (
            <Alert type="error" showIcon title={errorMessage(diff.error)} />
          ) : (
            <VersionDiffTable
              changes={diff.data?.changes}
              loading={diff.isLoading}
              from={from!}
              to={to!}
            />
          )}
        </>
      )}
    </>
  );
}

export function VersionDiffTable({
  changes,
  loading,
  from,
  to,
}: {
  changes: FieldChange[] | undefined;
  loading?: boolean;
  from: number;
  to: number;
}) {
  if (!loading && changes && changes.length === 0) {
    return <Typography.Text type="secondary">Hai phiên bản giống nhau.</Typography.Text>;
  }
  return (
    <Table<FieldChange>
      size="small"
      loading={loading}
      pagination={false}
      rowKey="path"
      dataSource={changes ?? []}
      columns={[
        { title: "Trường", dataIndex: "path", render: (path: string) => diffPathLabel(path) },
        {
          title: `rev ${from}`,
          key: "before",
          render: (_, change) =>
            change.added || change.removed ? (
              <>
                {(change.removed ?? []).map((name) => (
                  <div key={name}>
                    <Typography.Text type="danger">− {name}</Typography.Text>
                  </div>
                ))}
              </>
            ) : (
              diffValue(change.path, change.before)
            ),
        },
        {
          title: `rev ${to}`,
          key: "after",
          render: (_, change) =>
            change.added || change.removed ? (
              <>
                {(change.added ?? []).map((name) => (
                  <div key={name}>
                    <Typography.Text type="success">+ {name}</Typography.Text>
                  </div>
                ))}
              </>
            ) : (
              <Typography.Text strong>{diffValue(change.path, change.after)}</Typography.Text>
            ),
        },
      ]}
    />
  );
}

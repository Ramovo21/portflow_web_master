import { useMemo, useState } from "react";
import { Checkbox, Collapse, Empty, Input, Modal, Space, Tag, Typography } from "antd";

import type { ServiceGroup, ServiceItem } from "../api/lookups";

interface Props {
  open: boolean;
  services: ServiceItem[];
  groups: ServiceGroup[];

  excludeCodes: string[];
  onSelect(selected: ServiceItem[]): void;
  onCancel(): void;
}

export function ServicePickerModal({
  open,
  services,
  groups,
  excludeCodes,
  onSelect,
  onCancel,
}: Props) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const grouped = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const visible = services.filter(
      (service) =>
        service.active &&
        !excludeCodes.includes(service.code) &&
        (!keyword ||
          service.code.toLowerCase().includes(keyword) ||
          service.name.toLowerCase().includes(keyword)),
    );
    const byGroup = new Map<string, ServiceItem[]>();
    for (const service of visible) {
      byGroup.set(service.groupCode, [...(byGroup.get(service.groupCode) ?? []), service]);
    }
    return [...byGroup.entries()].map(([code, items]) => ({
      code,
      name: groups.find((group) => group.code === code)?.name ?? code,
      items,
    }));
  }, [services, groups, excludeCodes, query]);

  const close = () => {
    setPicked([]);
    setQuery("");
  };

  return (
    <Modal
      open={open}
      title="Thêm dịch vụ"
      okText={picked.length ? `Thêm ${picked.length} dịch vụ` : "Thêm"}
      okButtonProps={{ disabled: picked.length === 0 }}
      cancelText="Đóng"
      width={640}
      destroyOnHidden
      onCancel={() => {
        close();
        onCancel();
      }}
      onOk={() => {
        onSelect(services.filter((service) => picked.includes(service.code)));
        close();
      }}
    >
      <Input.Search
        placeholder="Tìm theo mã hoặc tên dịch vụ"
        allowClear
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        style={{ marginBottom: 12 }}
      />
      {grouped.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matching services left." />
      ) : (
        <Checkbox.Group
          value={picked}
          onChange={(values) => setPicked(values as string[])}
          style={{ width: "100%" }}
        >
          <Collapse
            style={{ width: "100%" }}
            defaultActiveKey={grouped.map((group) => group.code)}
            items={grouped.map((group) => ({
              key: group.code,
              label: `${group.name} (${group.items.length})`,
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {group.items.map((service) => (
                    <Checkbox key={service.code} value={service.code}>
                      <Typography.Text code>{service.code}</Typography.Text> {service.name}{" "}
                      <Typography.Text type="secondary">· {service.uom}</Typography.Text>
                      {service.mandatoryDefault && (
                        <Tag style={{ marginInlineStart: 6 }}>Bắt buộc</Tag>
                      )}
                    </Checkbox>
                  ))}
                </Space>
              ),
            }))}
          />
        </Checkbox.Group>
      )}
    </Modal>
  );
}

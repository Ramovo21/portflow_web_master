import { Card, Flex, Typography } from "antd";

import type { InstanceView } from "@/features/workflow";
import { StatusTag } from "@/shared/components/status/StatusTag";
import { formatDate } from "@/shared/lib/format";

export function PreviousSubmissions({ instances }: { instances: InstanceView[] }) {
  if (instances.length === 0) return null;
  return (
    <Card size="small" title="Các lần gửi trước">
      <Flex vertical gap={8}>
        {instances.map((instance, index) => (
          <Flex key={instance.id} justify="space-between" align="center" gap={8} wrap>
            <Typography.Text>
              Lần {instances.length - index} · gửi {formatDate(instance.submittedAt)}
            </Typography.Text>
            <StatusTag kind="WORKFLOW" status={instance.status} />
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

import { Divider, Empty, Timeline, Typography } from "antd";

import { RelativeTime } from "@/shared/components/data/DateText";

import type { TimelineEntry } from "./timelineEntry";

export type { TimelineEntry };

const ACTIONS: Record<string, { label: string; color: string }> = {
  SUBMIT: { label: "Gửi duyệt", color: "blue" },
  APPROVE: { label: "Duyệt", color: "green" },
  REJECT: { label: "Từ chối", color: "red" },
  REQUEST_REVISION: { label: "Yêu cầu sửa", color: "orange" },
  CARRIED_OVER: { label: "Giữ kết quả vòng trước", color: "gray" },
};

interface Props {
  entries: TimelineEntry[];

  newestFirst?: boolean;
  limit?: number;
}

export function HistoryTimeline({ entries, newestFirst = true, limit }: Props) {
  if (entries.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet." />;
  }
  const sorted = [...entries].sort((a, b) =>
    newestFirst ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at),
  );
  const shown = limit ? sorted.slice(0, limit) : sorted;
  const rounds = new Set(shown.map((entry) => entry.round));
  const showRounds = rounds.size > 1;

  const items: { key: string; color?: string; content: React.ReactNode }[] = [];
  let lastRound: number | undefined;
  for (const [index, entry] of shown.entries()) {
    if (showRounds && entry.round !== lastRound) {
      items.push({
        key: `round-${entry.round}-${index}`,
        color: "gray",
        content: (
          <Divider plain style={{ margin: "0 0 4px" }}>
            Vòng {entry.round}
          </Divider>
        ),
      });
      lastRound = entry.round;
    }
    const meta = ACTIONS[entry.action] ?? { label: entry.action, color: "gray" };
    items.push({
      key: `${entry.at}-${index}`,
      color: meta.color,
      content: (
        <div>
          <Typography.Text strong>{entry.actorName ?? "—"}</Typography.Text>
          {entry.onBehalfOfName && (
            <Typography.Text type="secondary"> (thay mặt {entry.onBehalfOfName})</Typography.Text>
          )}{" "}
          <Typography.Text>{meta.label.toLowerCase()}</Typography.Text>
          {entry.stepName && (
            <Typography.Text type="secondary"> · {entry.stepName}</Typography.Text>
          )}
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              <RelativeTime value={entry.at} />
            </Typography.Text>
          </div>
          {entry.comment && (
            <Typography.Paragraph
              italic
              style={{
                margin: "4px 0 0",
                paddingLeft: 8,
                borderLeft: "3px solid var(--pf-border)",
              }}
            >
              “{entry.comment}”
            </Typography.Paragraph>
          )}
        </div>
      ),
    });
  }
  return <Timeline items={items} />;
}

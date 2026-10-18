import { Alert, Input } from "antd";

interface Props {
  value: string;
  onChange(value: string): void;
  error: string | null;
  readOnly?: boolean;
}

export function JsonEditor({ value, onChange, error, readOnly }: Props) {
  return (
    <div>
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 8 }} />}
      <Input.TextArea
        aria-label="JSON định nghĩa"
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        autoSize={{ minRows: 20, maxRows: 48 }}
        spellCheck={false}
        status={error ? "error" : undefined}
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}
      />
    </div>
  );
}

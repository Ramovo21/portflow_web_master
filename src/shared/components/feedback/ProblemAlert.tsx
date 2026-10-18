import { Alert } from "antd";

import { errorMessage, problemOf } from "@/shared/lib/problem";

interface Props {
  error: unknown;
  title?: string;
  style?: React.CSSProperties;
}

export function ProblemAlert({ error, title, style }: Props) {
  if (!error) return null;
  const problem = problemOf(error);
  const errors = problem?.errors ?? [];
  return (
    <Alert
      type="error"
      showIcon
      style={style}
      title={title ?? errorMessage(error)}
      description={
        title || errors.length > 0 ? (
          <>
            {title && <div>{errorMessage(error)}</div>}
            {errors.length > 0 && (
              <ul style={{ margin: "4px 0 0", paddingInlineStart: 20 }}>
                {errors.map((item, index) => (
                  <li key={index}>
                    {item.field && <code>{item.field}</code>} {item.code && <b>[{item.code}]</b>}{" "}
                    {item.message}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : undefined
      }
    />
  );
}

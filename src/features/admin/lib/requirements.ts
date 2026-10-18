/** JSON hợp lệ dạng object (cột jsonb `submit_requirements`). */
export function parseRequirements(text: string): Record<string, unknown> | undefined {
  if (!text.trim()) return {};
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

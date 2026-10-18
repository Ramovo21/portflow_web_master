interface Props {
  compact?: boolean;
  size?: number;
  inverted?: boolean;
}

export function BrandLogo({ compact = false, size = 32, inverted = false }: Props) {
  const tile = inverted ? "#ffffff" : "var(--pf-brand)";
  const stroke = inverted ? "var(--pf-brand)" : "#ffffff";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill={tile} />
        <g
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="16" cy="8.5" r="2.5" />
          <path d="M16 11v14" />
          <path d="M11.5 15h9" />
          <path d="M8 18.5c0 4 3.6 6.5 8 6.5s8-2.5 8-6.5" />
        </g>
      </svg>
      {!compact && (
        <span
          style={{
            fontWeight: 700,
            fontSize: size * 0.6,
            letterSpacing: -0.3,
            color: inverted ? "#ffffff" : "var(--pf-text-strong)",
          }}
        >
          PortFlow
        </span>
      )}
    </span>
  );
}

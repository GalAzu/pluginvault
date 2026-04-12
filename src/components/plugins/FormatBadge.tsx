import { getFormatColor } from "../../lib/utils"

interface FormatBadgeProps {
  format: string
}

export function FormatBadge({ format }: FormatBadgeProps) {
  const color = getFormatColor(format)
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 12,
        fontWeight: 500,
        background: color + "20",
        color: color,
      }}
    >
      {format}
    </span>
  )
}

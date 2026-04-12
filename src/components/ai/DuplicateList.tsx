import { useState } from "react"
import type { DuplicateGroup } from "../../lib/types"
import { FormatBadge } from "../plugins/FormatBadge"
import { formatBytes, truncatePath } from "../../lib/utils"

interface DuplicateListProps {
  groups: DuplicateGroup[]
  onResolve: (groupIndex: number, keepPluginId: string) => void
}

export function DuplicateList({ groups, onResolve }: DuplicateListProps) {
  const [selected, setSelected] = useState<Record<number, string>>({})

  if (groups.length === 0) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", fontSize: 14, color: "#64748b" }}>
        No duplicates detected.
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {groups.map((group, gi) => (
        <div
          key={gi}
          style={{
            borderRadius: 12,
            border: "1px solid #2e3348",
            background: "#1a1d27",
            padding: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h4 style={{ fontWeight: 500, color: "#e2e8f0" }}>{group.reason}</h4>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {group.members.length} copies
            </span>
          </div>
          {group.recommendation && (
            <p style={{ fontSize: 12, color: "#22d3ee", marginBottom: 12 }}>{group.recommendation}</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {group.members.map((member) => (
              <label
                key={member.id}
                style={{
                  display: "flex",
                  cursor: "pointer",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 8,
                  border: selected[gi] === member.id ? "1px solid rgba(99,102,241,0.3)" : "1px solid #2e3348",
                  background: selected[gi] === member.id ? "rgba(99,102,241,0.05)" : "#242836",
                  padding: "12px 16px",
                }}
              >
                <input
                  type="radio"
                  name={`dup-${gi}`}
                  checked={selected[gi] === member.id}
                  onChange={() =>
                    setSelected((prev) => ({ ...prev, [gi]: member.id }))
                  }
                  style={{ accentColor: "#6366f1" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FormatBadge format={member.format} />
                    <span style={{ fontSize: 14, color: "#94a3b8" }}>
                      {member.version ?? "\u2014"}
                    </span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      {formatBytes(member.file_size_bytes)}
                    </span>
                  </div>
                  <p style={{ marginTop: 4, fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {truncatePath(member.file_path, 60)}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {selected[gi] && (
            <button
              onClick={() => onResolve(gi, selected[gi])}
              style={{
                marginTop: 12,
                borderRadius: 8,
                background: "#6366f1",
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Keep Selected, Remove Others
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

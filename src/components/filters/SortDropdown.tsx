import { useState, useRef, useEffect } from "react"
import { ArrowUpDown, Check } from "lucide-react"

interface SortDropdownProps {
  sortBy: string
  sortDesc: boolean
  onChange: (sortBy: string, sortDesc: boolean) => void
}

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "vendor", label: "Vendor" },
  { value: "format", label: "Format" },
  { value: "file_size_bytes", label: "Size" },
  { value: "first_seen", label: "Date Added" },
]

export function SortDropdown({
  sortBy,
  sortDesc,
  onChange,
}: SortDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const currentLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sort"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-light px-3 text-sm text-text-secondary hover:text-text"
      >
        <ArrowUpDown size={14} />
        {currentLabel}
        <span className="text-xs text-muted">{sortDesc ? "Z-A" : "A-Z"}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-surface py-1 shadow-xl">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                if (sortBy === option.value) {
                  onChange(option.value, !sortDesc)
                } else {
                  onChange(option.value, false)
                }
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-light hover:text-text"
            >
              {sortBy === option.value && (
                <Check size={14} className="text-primary" />
              )}
              <span className={sortBy === option.value ? "text-primary" : ""}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-light">
        <Icon size={28} className="text-muted" />
      </div>
      <h3 className="mb-1 text-lg font-medium text-text">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-muted">{description}</p>
      {action}
    </div>
  )
}

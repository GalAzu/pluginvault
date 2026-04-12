import { useEffect } from "react"
import { CheckCircle, XCircle, Info, X } from "lucide-react"
import { useAppStore } from "../../stores/appStore"

const ICON_MAP = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const COLOR_MAP = {
  success: "border-success/30 bg-success/10 text-success",
  error: "border-error/30 bg-error/10 text-error",
  info: "border-primary/30 bg-primary/10 text-primary",
}

interface ToastItemProps {
  id: string
  type: "success" | "error" | "info"
  message: string
}

function ToastItem({ id, type, message }: ToastItemProps) {
  const removeToast = useAppStore((s) => s.removeToast)
  const Icon = ICON_MAP[type]

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), 4000)
    return () => clearTimeout(timer)
  }, [id, removeToast])

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${COLOR_MAP[type]}`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="flex-1 text-sm text-text">{message}</span>
      <button
        onClick={() => removeToast(id)}
        className="shrink-0 text-muted hover:text-text"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  )
}

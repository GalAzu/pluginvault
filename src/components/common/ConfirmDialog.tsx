import { Modal } from "./Modal"

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  confirmVariant?: "danger" | "primary"
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
      <p className="mb-6 text-sm text-text-secondary">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-surface-light"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
            confirmVariant === "danger"
              ? "bg-error hover:bg-error/80"
              : "bg-primary hover:bg-primary-hover"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

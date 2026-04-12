export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "\u2014"
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "Never"
  const now = Date.now()
  const diff = now - d.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}

const FORMAT_COLORS: Record<string, string> = {
  VST3: "#6366f1",
  VST2: "#a855f7",
  AU: "#3b82f6",
  AAX: "#f97316",
  CLAP: "#22c55e",
}

export function getFormatColor(format: string): string {
  return FORMAT_COLORS[format] ?? "#64748b"
}

export function truncatePath(path: string, maxLen = 50): string {
  if (path.length <= maxLen) return path
  const parts = path.split("/")
  if (parts.length <= 3) return path
  return `${parts[0]}/.../${parts.slice(-2).join("/")}`
}

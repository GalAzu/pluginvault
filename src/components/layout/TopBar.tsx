import { Search, LayoutGrid, List, RefreshCw } from "lucide-react"
import { useAppStore } from "../../stores/appStore"
import { useScanner } from "../../hooks/useScanner"

export function TopBar() {
  const globalSearch = useAppStore((s) => s.globalSearch)
  const setGlobalSearch = useAppStore((s) => s.setGlobalSearch)
  const viewMode = useAppStore((s) => s.viewMode)
  const toggleViewMode = useAppStore((s) => s.toggleViewMode)
  const { startScan, scanInProgress } = useScanner()

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Search plugins..."
          className="h-9 w-full rounded-lg border border-border bg-surface-light pl-9 pr-3 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* View toggle */}
        <div className="flex rounded-lg border border-border">
          <button
            onClick={() => viewMode !== "table" && toggleViewMode()}
            className={`flex h-8 w-8 items-center justify-center rounded-l-lg transition-colors ${
              viewMode === "table"
                ? "bg-primary/15 text-primary"
                : "text-muted hover:text-text"
            }`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => viewMode !== "grid" && toggleViewMode()}
            className={`flex h-8 w-8 items-center justify-center rounded-r-lg transition-colors ${
              viewMode === "grid"
                ? "bg-primary/15 text-primary"
                : "text-muted hover:text-text"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>

        {/* Scan button */}
        <button
          onClick={() => startScan()}
          disabled={scanInProgress}
          className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={scanInProgress ? "animate-spin" : ""}
          />
          {scanInProgress ? "Scanning..." : "Scan"}
        </button>
      </div>
    </header>
  )
}

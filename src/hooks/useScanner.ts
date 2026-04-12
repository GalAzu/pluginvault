import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { scanPlugins } from "../lib/tauri"
import { useAppStore } from "../stores/appStore"
import type { ScanSummary, ScanProgressEvent } from "../lib/types"

export function useScanner() {
  const setScanInProgress = useAppStore((s) => s.setScanInProgress)
  const setScanProgress = useAppStore((s) => s.setScanProgress)
  const scanInProgress = useAppStore((s) => s.scanInProgress)
  const scanProgress = useAppStore((s) => s.scanProgress)
  const addToast = useAppStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const startScan = useCallback(
    async (customPaths?: string[]) => {
      if (scanInProgress) return

      setScanInProgress(true)
      setScanProgress({
        phase: "starting",
        current_path: "",
        plugins_found: 0,
        directories_scanned: 0,
      })

      // Listen for progress events emitted from the Rust backend
      let unlisten: UnlistenFn | null = null
      try {
        unlisten = await listen<ScanProgressEvent>("scan-progress", (event) => {
          setScanProgress(event.payload)
        })
      } catch {
        // If event plugin not available, continue without progress updates
      }

      try {
        const summary: ScanSummary = await scanPlugins(customPaths)
        addToast(
          "success",
          `Scan complete: ${summary.total_found} found, ${summary.new_plugins} new, ${summary.updated_plugins} updated`,
        )
        await queryClient.invalidateQueries({ queryKey: ["plugins"] })
        await queryClient.invalidateQueries({ queryKey: ["stats"] })
        return summary
      } catch (err) {
        addToast("error", `Scan failed: ${err}`)
        throw err
      } finally {
        if (unlisten) unlisten()
        setScanInProgress(false)
        setScanProgress(null)
      }
    },
    [scanInProgress, setScanInProgress, setScanProgress, addToast, queryClient],
  )

  return {
    startScan,
    scanInProgress,
    scanProgress,
  }
}

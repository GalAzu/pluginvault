import { useQuery } from "@tanstack/react-query"
import { getPlugins } from "../lib/tauri"
import type { PluginFilter } from "../lib/types"

export function usePlugins(filter?: PluginFilter) {
  return useQuery({
    queryKey: ["plugins", filter],
    queryFn: () => getPlugins(filter),
  })
}

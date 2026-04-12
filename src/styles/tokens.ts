// PluginVault design tokens — single source of truth for colors, spacing, radii, shadows, typography.
// Use inline styles only (no Tailwind classes).

export const colors = {
  // Backgrounds
  bg: "#0a0b10",
  surface: "#14161f",
  surfaceLight: "#1c1f2b",
  surfaceLighter: "#262a3a",

  // Brand
  primary: "#7c8cfa",
  primaryHover: "#9ca3fb",
  accent: "#22d3ee",

  // Text — contrast fixed to pass WCAG AA on dark surfaces
  text: "#f1f5f9",
  textSecondary: "#cbd5e1",
  muted: "#94a3b8",
  mutedStrong: "#64748b",

  // Border
  border: "#2a2f42",
  borderStrong: "#3a4057",

  // Status
  success: "#22c55e",
  successBg: "rgba(34,197,94,0.12)",
  warning: "#f59e0b",
  warningBg: "rgba(245,158,11,0.12)",
  error: "#ef4444",
  errorBg: "rgba(239,68,68,0.12)",
  info: "#6366f1",

  // Plugin formats
  vst3: "#6366f1",
  vst2: "#a855f7",
  au: "#3b82f6",
  aax: "#f97316",
  clap: "#22c55e",
} as const

export const formatColors: Record<string, string> = {
  VST3: colors.vst3,
  VST2: colors.vst2,
  AU: colors.au,
  AAX: colors.aax,
  CLAP: colors.clap,
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const

export const shadows = {
  sm: "0 1px 2px rgba(0,0,0,0.3)",
  md: "0 4px 12px rgba(0,0,0,0.4)",
  lg: "0 8px 24px rgba(0,0,0,0.5)",
  glow: "0 0 0 3px rgba(124,140,250,0.25)",
} as const

export const typography = {
  fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`,
  mono: `"SF Mono", Monaco, "Cascadia Code", monospace`,
} as const

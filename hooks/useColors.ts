export const colors = {
  primary: "#6366f1",
  primaryLight: "#818cf8",
  primaryDark: "#4f46e5",
  background: "#0a0a14",
  surface: "#131320",
  surfaceLight: "#1e1e35",
  surfaceBorder: "#2a2a45",
  text: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
} as const;

export function useColors() {
  return colors;
}

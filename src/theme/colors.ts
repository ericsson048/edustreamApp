export const Colors: Record<
  ColorScheme,
  {
    background: string;
    surface: string;
    surfaceSecondary: string;
    surfaceTertiary: string;
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryMedium: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    borderInput: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    notificationBadge: string;
    skeleton: string;
    cardShadow: string;
    overlay: string;
    tabInactive: string;
    tabBarBorder: string;
  }
> = {
  light: {
    background: "#EEF2FF",
    surface: "#ffffff",
    surfaceSecondary: "#f1f5f9",
    surfaceTertiary: "#e2e8f0",
    primary: "#4F46E5",
    primaryHover: "#4338CA",
    primaryLight: "#EEF2FF",
    primaryMedium: "#C7D2FE",
    text: "#1E1B4B",
    textSecondary: "#475569",
    textMuted: "#94A3B8",
    border: "#E2E8F0",
    borderInput: "#C7D2FE",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#6366F1",
    notificationBadge: "#EF4444",
    skeleton: "#E2E8F0",
    cardShadow: "rgba(79,70,229,0.08)",
    overlay: "rgba(30,27,75,0.4)",
    tabInactive: "#94A3B8",
    tabBarBorder: "#E2E8F0",
  },
  dark: {
    background: "#0F0A2E",
    surface: "#1A1543",
    surfaceSecondary: "#252050",
    surfaceTertiary: "#302B60",
    primary: "#818CF8",
    primaryHover: "#6366F1",
    primaryLight: "rgba(129,140,248,0.15)",
    primaryMedium: "rgba(129,140,248,0.25)",
    text: "#F1F5F9",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    border: "#2D2860",
    borderInput: "#3D3870",
    success: "#4ADE80",
    warning: "#FBBF24",
    error: "#F87171",
    info: "#818CF8",
    notificationBadge: "#EF4444",
    skeleton: "#2D2860",
    cardShadow: "rgba(0,0,0,0.3)",
    overlay: "rgba(0,0,0,0.6)",
    tabInactive: "#64748B",
    tabBarBorder: "#2D2860",
  },
};

export type ColorScheme = "light" | "dark";

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  "3xl": 28,
  full: 9999,
};

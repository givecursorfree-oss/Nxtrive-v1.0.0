import { loadSettings, saveSettings, type ThemeMode } from "./storage";

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function applyTheme(mode: ThemeMode): "light" | "dark" {
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function initTheme(): "light" | "dark" {
  return applyTheme(loadSettings().theme);
}

export function setThemeMode(mode: ThemeMode): "light" | "dark" {
  saveSettings({ theme: mode });
  return applyTheme(mode);
}

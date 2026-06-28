import { create } from "zustand";
import { setThemeMode as applyThemeMode } from "../lib/theme";
import { loadSettings, saveSettings, type AppSettings, type ThemeMode } from "../lib/storage";

interface SettingsState extends AppSettings {
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  sourcesPanelOpen: boolean;
  setTopK: (value: number) => void;
  setTheme: (value: ThemeMode) => void;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSettingsOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setSourcesPanelOpen: (open: boolean) => void;
}

const initial = loadSettings();

export const useSettingsStore = create<SettingsState>((set) => ({
  topK: initial.topK,
  sidebarCollapsed: initial.sidebarCollapsed,
  theme: initial.theme,
  settingsOpen: false,
  shortcutsOpen: false,
  sourcesPanelOpen: false,
  setTopK: (value) => {
    saveSettings({ topK: value });
    set({ topK: value });
  },
  setTheme: (value) => {
    saveSettings({ theme: value });
    applyThemeMode(value);
    set({ theme: value });
  },
  setSidebarCollapsed: (value) => {
    saveSettings({ sidebarCollapsed: value });
    set({ sidebarCollapsed: value });
  },
  toggleSidebarCollapsed: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      saveSettings({ sidebarCollapsed: next });
      return { sidebarCollapsed: next };
    }),
  setSettingsOpen: (open) =>
    set(
      open
        ? { settingsOpen: true, shortcutsOpen: false, sourcesPanelOpen: false }
        : { settingsOpen: false },
    ),
  setShortcutsOpen: (open) =>
    set(
      open
        ? { shortcutsOpen: true, settingsOpen: false, sourcesPanelOpen: false }
        : { shortcutsOpen: false },
    ),
  setSourcesPanelOpen: (open) =>
    set(
      open
        ? { sourcesPanelOpen: true, settingsOpen: false, shortcutsOpen: false }
        : { sourcesPanelOpen: false },
    ),
}));

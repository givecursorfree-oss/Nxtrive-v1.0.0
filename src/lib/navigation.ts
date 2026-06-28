import { formatCollectionName } from "./format";
import { BRAND_NAME } from "./brand";
import { useSettingsStore } from "../store/useSettingsStore";

export type AppView = "chat" | "settings" | "shortcuts" | "welcome";

export interface BreadcrumbItem {
  id: string;
  label: string;
  /** Present when the item is navigable (future routing). */
  href?: string;
  /** Present when the item triggers in-app navigation (e.g. home). */
  navigable?: boolean;
  current?: boolean;
}

interface BreadcrumbOptions {
  collection: string | null;
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  welcomeOpen: boolean;
}

export function resolveActiveView(options: BreadcrumbOptions): AppView {
  if (options.welcomeOpen) return "welcome";
  if (options.settingsOpen) return "settings";
  if (options.shortcutsOpen) return "shortcuts";
  return "chat";
}

export function isAtHomeView(options: BreadcrumbOptions): boolean {
  if (options.welcomeOpen) return false;
  if (options.settingsOpen || options.shortcutsOpen) return false;
  return resolveActiveView(options) === "chat";
}

/** Return to the main chat view and close auxiliary panels. */
export function navigateHome(): void {
  const settings = useSettingsStore.getState();
  settings.setSettingsOpen(false);
  settings.setShortcutsOpen(false);
  settings.setSourcesPanelOpen(false);

  const main = document.getElementById("main-chat");
  if (main instanceof HTMLElement) {
    main.focus({ preventScroll: true });
  }
}

export function buildBreadcrumbs(options: BreadcrumbOptions): BreadcrumbItem[] {
  const view = resolveActiveView(options);
  const atHome = isAtHomeView(options);
  const items: BreadcrumbItem[] = [
    { id: "home", label: BRAND_NAME, navigable: !atHome },
  ];

  if (view === "welcome") {
    items.push({ id: "welcome", label: "Welcome tour", current: true });
    return items;
  }

  if (options.collection) {
    items.push({
      id: "collection",
      label: formatCollectionName(options.collection),
    });
  }

  if (view === "settings") {
    items.push({ id: "settings", label: "Settings", current: true });
    return items;
  }

  if (view === "shortcuts") {
    items.push({ id: "shortcuts", label: "Shortcuts", current: true });
    return items;
  }

  items.push({ id: "chat", label: "Chat", current: true });
  return items;
}

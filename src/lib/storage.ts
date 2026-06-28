import type { PromptMode } from "./chat-modes";
import type { ChatMessage } from "../store/useAppStore";

const CHAT_HISTORY_KEY = "nxtrive_chat_history";
const LAST_COLLECTION_KEY = "nxtrive_last_collection";
const SETTINGS_KEY = "nxtrive_settings";
const ONBOARDING_KEY = "nxtrive_onboarding_done";
const WELCOME_KEY = "nxtrive_welcome_done";
const SETUP_DISCLAIMER_KEY = "nxtrive_setup_disclaimer_seen";
const PROMPT_MODES_HINT_KEY = "nxtrive_prompt_modes_hint_seen";
const PROMPT_MODE_KEY = "nxtrive_last_prompt_mode";

const LEGACY_STORAGE_KEYS: Record<string, string> = {
  privatemind_chat_history: CHAT_HISTORY_KEY,
  privatemind_last_collection: LAST_COLLECTION_KEY,
  privatemind_settings: SETTINGS_KEY,
  privatemind_onboarding_done: ONBOARDING_KEY,
  privatemind_welcome_done: WELCOME_KEY,
  privatemind_setup_disclaimer_seen: SETUP_DISCLAIMER_KEY,
  privatemind_prompt_modes_hint_seen: PROMPT_MODES_HINT_KEY,
  privatemind_last_prompt_mode: PROMPT_MODE_KEY,
};

function migrateLegacyStorageKeys(): void {
  try {
    for (const [legacyKey, nextKey] of Object.entries(LEGACY_STORAGE_KEYS)) {
      if (!localStorage.getItem(nextKey) && localStorage.getItem(legacyKey)) {
        localStorage.setItem(nextKey, localStorage.getItem(legacyKey)!);
        localStorage.removeItem(legacyKey);
      }
    }
  } catch {
    // ignore quota / private mode errors
  }
}

migrateLegacyStorageKeys();

export type ThemeMode = "light" | "dark" | "system";

export interface AppSettings {
  topK: number;
  sidebarCollapsed: boolean;
  theme: ThemeMode;
}

const DEFAULT_SETTINGS: AppSettings = {
  topK: 5,
  sidebarCollapsed: false,
  theme: "light",
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function isOnboardingDone(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function setOnboardingDone(): void {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function isWelcomeDone(): boolean {
  return localStorage.getItem(WELCOME_KEY) === "true";
}

export function setWelcomeDone(): void {
  localStorage.setItem(WELCOME_KEY, "true");
}

export function isSetupDisclaimerSeen(): boolean {
  return localStorage.getItem(SETUP_DISCLAIMER_KEY) === "true";
}

export function setSetupDisclaimerSeen(): void {
  localStorage.setItem(SETUP_DISCLAIMER_KEY, "true");
}

export function resetWelcome(): void {
  localStorage.removeItem(WELCOME_KEY);
}

export function loadLastPromptMode(): PromptMode {
  try {
    const raw = localStorage.getItem(PROMPT_MODE_KEY);
    if (raw === "search" || raw === "think" || raw === "sources") return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveLastPromptMode(mode: PromptMode): void {
  try {
    if (!mode) {
      localStorage.removeItem(PROMPT_MODE_KEY);
      return;
    }
    localStorage.setItem(PROMPT_MODE_KEY, mode);
  } catch {
    // ignore quota errors
  }
}

export function isPromptModesHintSeen(): boolean {
  return localStorage.getItem(PROMPT_MODES_HINT_KEY) === "true";
}

export function setPromptModesHintSeen(): void {
  localStorage.setItem(PROMPT_MODES_HINT_KEY, "true");
}

export function loadAllChatHistory(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ChatMessage[]>;
  } catch {
    return {};
  }
}

export function saveChatHistory(collection: string, messages: ChatMessage[]): void {
  const all = loadAllChatHistory();
  if (messages.length === 0) {
    delete all[collection];
  } else {
    all[collection] = messages.map((m) => ({ ...m, isStreaming: false }));
  }
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(all));
}

export function loadChatHistory(collection: string): ChatMessage[] {
  return loadAllChatHistory()[collection] ?? [];
}

export function loadLastCollection(): string | null {
  try {
    return localStorage.getItem(LAST_COLLECTION_KEY);
  } catch {
    return null;
  }
}

export function saveLastCollection(collection: string | null): void {
  try {
    if (!collection) {
      localStorage.removeItem(LAST_COLLECTION_KEY);
      return;
    }
    localStorage.setItem(LAST_COLLECTION_KEY, collection);
  } catch {
    // ignore quota errors
  }
}

export function deleteChatHistory(collection: string): void {
  const all = loadAllChatHistory();
  delete all[collection];
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(all));
}

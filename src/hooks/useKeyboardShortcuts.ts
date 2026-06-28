import { useEffect } from "react";
import { getCurrentOS } from "../lib/api";
import { NXTRIVE_REQUEST_CLEAR_CHAT } from "../lib/app-events";
import { navigateHome } from "../lib/navigation";
import { useSettingsStore } from "../store/useSettingsStore";
import { useAppStore } from "../store/useAppStore";

let chatAbortController: AbortController | null = null;

export function registerChatAbort(controller: AbortController | null) {
  chatAbortController = controller;
}

export function stopChatStream() {
  chatAbortController?.abort();
  chatAbortController = null;
}

export function useKeyboardShortcuts() {
  const setShortcutsOpen = useSettingsStore((s) => s.setShortcutsOpen);
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  const isStreaming = useAppStore((s) => s.isStreaming);
  useEffect(() => {
    let os: Awaited<ReturnType<typeof getCurrentOS>> = "unknown";
    void getCurrentOS().then((value) => {
      os = value;
    });

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = os === "macos" ? event.metaKey : event.ctrlKey;
      const target = event.target as HTMLElement | null;
      const inInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "?" && !inInput) {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (event.key === "Escape") {
        const { settingsOpen, shortcutsOpen, sourcesPanelOpen } = useSettingsStore.getState();
        if (settingsOpen || shortcutsOpen || sourcesPanelOpen) {
          event.preventDefault();
          navigateHome();
          return;
        }
        if (isStreaming) {
          event.preventDefault();
          stopChatStream();
        }
        return;
      }

      if (!mod) return;

      if (event.key === "k" || event.key === "K") {
        event.preventDefault();
        document.getElementById("chat-input")?.focus();
        return;
      }

      if (event.key === "l" || event.key === "L") {
        if (!inInput) {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent(NXTRIVE_REQUEST_CLEAR_CHAT));
        }
        return;
      }

      if (event.key === "h" || event.key === "H") {
        if (event.shiftKey && !inInput) {
          event.preventDefault();
          navigateHome();
        }
        return;
      }

      if (event.key === ",") {
        event.preventDefault();
        setSettingsOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isStreaming, setSettingsOpen, setShortcutsOpen]);
}

import { useEffect, useState } from "react";
import { getSendShortcutLabel } from "../lib/api";
import { useSettingsStore } from "../store/useSettingsStore";
import { Button } from "./ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function KeyboardShortcutsModal() {
  const open = useSettingsStore((s) => s.shortcutsOpen);
  const setOpen = useSettingsStore((s) => s.setShortcutsOpen);
  const [modKey, setModKey] = useState("Ctrl");

  useEffect(() => {
    if (open) void getSendShortcutLabel().then((label) => setModKey(label.replace("+Enter", "")));
  }, [open]);

  const shortcuts = [
    { keys: "Enter", action: "Send message" },
    { keys: "Shift + Enter", action: "New line in message" },
    { keys: `${modKey} + K`, action: "Focus chat input" },
    { keys: `${modKey} + L`, action: "Clear chat" },
    { keys: `${modKey} + Shift + H`, action: "Go home" },
    { keys: `${modKey} + ,`, action: "Open settings" },
    { keys: "Esc", action: "Close panels or stop streaming" },
    { keys: "?", action: "Show this help" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Press Esc to close this panel.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {shortcuts.map((item) => (
            <li key={item.keys} className="flex items-center justify-between gap-4">
              <span className="type-body-sm text-slate">{item.action}</span>
              <kbd className="rounded-md border border-mist bg-paper-white px-2 py-1 type-mono-xs text-carbon">
                {item.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <Button variant="ghost" fullWidth onClick={() => setOpen(false)}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BRAND_NAME } from "@/lib/brand";
import { setSetupDisclaimerSeen } from "@/lib/storage";

interface SetupFirstRunNoticeProps {
  open: boolean;
  onDismiss: () => void;
}

const NOTICE_SECTIONS = [
  {
    title: "First run only",
    body: "One-time setup usually takes 10–30 minutes, depending on your internet. You will not see this again after everything is ready.",
  },
  {
    title: "Terminal downloads",
    body: "We open Terminal or PowerShell to install Ollama and download AI models. Large files like Llama 3 can take a while — that is normal.",
  },
  {
    title: "Keep Nxtrive open",
    body: "Leave this app open. We detect each step automatically and move you forward when installs finish.",
  },
  {
    title: "When Terminal finishes",
    body: "You will see a success message, then Press Enter to close or the window closes on its own in about 12 seconds.",
  },
] as const;

export function SetupFirstRunNotice({ open, onDismiss }: SetupFirstRunNoticeProps) {
  const continueRef = useRef<HTMLButtonElement>(null);

  const handleContinue = useCallback(() => {
    setSetupDisclaimerSeen();
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (open) {
      continueRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleContinue();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleContinue]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleContinue();
      }}
    >
      <DialogContent
        className="flex flex-col gap-0 p-0 sm:max-h-[min(560px,80vh)] sm:max-w-lg [&>button:last-child]:top-3 [&>button:last-child]:hidden"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          handleContinue();
        }}
      >
        <div className="overflow-y-auto">
          <DialogHeader className="contents space-y-0 text-left">
            <DialogTitle className="border-b border-mist px-6 pb-4 pt-6 text-base">
              First-time setup notice
            </DialogTitle>
            <DialogDescription asChild>
              <div className="px-6 py-5">
                <p className="type-body-sm text-slate">
                  Before {BRAND_NAME} checks prerequisites, here is what to expect on your first
                  install.
                </p>
                <div className="mt-4 space-y-4">
                  {NOTICE_SECTIONS.map((section) => (
                    <div key={section.title} className="space-y-1">
                      <p className="type-body-sm font-semibold text-deep-ink">{section.title}</p>
                      <p className="type-body-sm leading-snug text-slate">{section.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter className="border-t border-mist px-6 py-4">
          <Button ref={continueRef} variant="primary" fullWidth onClick={handleContinue}>
            Continue setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

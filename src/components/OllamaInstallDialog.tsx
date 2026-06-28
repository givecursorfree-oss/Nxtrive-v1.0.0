import {
  ArrowTopRightOnSquareIcon,
  CloudArrowDownIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";

import type { OllamaInstallGuide } from "@/lib/ollama-install";
import { BRAND_NAME } from "@/lib/brand";
import { Button } from "./ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

interface OllamaInstallDialogProps {
  open: boolean;
  guide: OllamaInstallGuide | null;
  onAutomatic: () => void;
  onManual: () => void;
  onCancel: () => void;
}

export function OllamaInstallDialog({
  open,
  guide,
  onAutomatic,
  onManual,
  onCancel,
}: OllamaInstallDialogProps) {
  if (!guide) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
    >
      <DialogContent className="max-w-md" showCloseButton>
        <div className="space-y-4">
          <div>
            <DialogTitle className="type-subheading font-semibold text-deep-ink">
              Install Ollama for {guide.platformLabel}
            </DialogTitle>
            <DialogDescription className="mt-2 type-body-sm text-slate">
              {BRAND_NAME} needs Ollama on this computer. Choose how you want to install it.
            </DialogDescription>
          </div>

          <div className="rounded-button border border-mist bg-paper-white px-3 py-2 type-caption text-helper">
            Opens:{" "}
            <code className="type-mono-xs text-deep-ink">{guide.installUrl}</code>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={onAutomatic}
              icon={<CloudArrowDownIcon className="h-4 w-4 shrink-0" aria-hidden />}
              className="w-full justify-center"
            >
              {guide.automaticLabel}
            </Button>
            <Button
              variant="ghost"
              onClick={onManual}
              icon={<CommandLineIcon className="h-4 w-4 shrink-0" aria-hidden />}
              className="w-full justify-center"
            >
              {guide.manualLabel}
            </Button>
            <Button variant="ghost" onClick={onCancel} className="w-full justify-center">
              Cancel
            </Button>
          </div>

          {guide.manualCommand && (
            <p className="type-caption text-helper">
              <ArrowTopRightOnSquareIcon
                className="mr-1 inline h-5 w-5 align-text-bottom"
                aria-hidden
              />
              Manual also copies:{" "}
              <code className="type-mono-xs text-deep-ink">{guide.manualCommand}</code>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

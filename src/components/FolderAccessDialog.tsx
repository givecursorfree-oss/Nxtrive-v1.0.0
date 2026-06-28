import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen } from "lucide-react";

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
import {
  registerFolderAccessHandler,
  type FolderAccessRequest,
} from "@/lib/folder-access";

export function FolderAccessDialog() {
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState<string | undefined>();
  const resolveRef = useRef<((allowed: boolean) => void) | null>(null);
  const denyRef = useRef<HTMLButtonElement>(null);

  const finish = useCallback((allowed: boolean) => {
    resolveRef.current?.(allowed);
    resolveRef.current = null;
    setOpen(false);
    setFolderName(undefined);
  }, []);

  const handleRequest = useCallback((request: FolderAccessRequest) => {
    resolveRef.current = request.resolve;
    setFolderName(request.folderName);
    setOpen(true);
  }, []);

  useEffect(() => {
    registerFolderAccessHandler(handleRequest);
    return () => registerFolderAccessHandler(null);
  }, [handleRequest]);

  useEffect(() => {
    if (open) {
      denyRef.current?.focus();
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) finish(false);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={() => finish(false)}
      >
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-card bg-pale-cyan-muted text-forest-teal">
            <FolderOpen className="h-5 w-5" aria-hidden />
          </div>
          <DialogTitle>Allow {BRAND_NAME} to access your documents?</DialogTitle>
          <DialogDescription>
            {folderName ? (
              <>
                <span className="font-medium text-deep-ink">{folderName}</span> will be read and
                indexed locally on your device. Your files are never uploaded to the cloud.
              </>
            ) : (
              <>
                {BRAND_NAME} reads files from folders you choose and builds a private search index
                on this machine. Nothing leaves your device.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button ref={denyRef} variant="ghost" onClick={() => finish(false)}>
            Don&apos;t allow
          </Button>
          <Button variant="primary" onClick={() => finish(true)}>
            Allow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

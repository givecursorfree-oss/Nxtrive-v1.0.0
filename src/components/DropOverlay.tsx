import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface DropOverlayProps {
  visible: boolean;
}

export function DropOverlay({ visible }: DropOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-deep-indigo/20 p-6 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label="Drop files or folder to index"
    >
      <div className="panel-enter flex max-w-md flex-col items-center rounded-card border-2 border-dashed border-deep-indigo/50 bg-card-white/95 px-10 py-12 text-center shadow-xl">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-card surface-accent">
          <ArrowDownTrayIcon className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="type-subheading font-light text-deep-ink">Drop files or folder to index</p>
        <p className="mt-2 type-body-sm text-slate">
          Release to add documents. Files are indexed locally on your machine.
        </p>
      </div>
    </div>
  );
}

import { Cog6ToothIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCollectionSources } from "../hooks/useCollectionSources";
import { formatCollectionName } from "../lib/format";
import { useSettingsStore } from "../store/useSettingsStore";
import { toast } from "../store/useToastStore";
import { CollectionSourcesList } from "./CollectionSourcesList";
import { Button } from "./ui/Button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./ui/sheet";

interface ChatSourcesDrawerProps {
  collectionName: string;
  onPreview: (sourcePath: string) => void;
}

export function ChatSourcesDrawer({ collectionName, onPreview }: ChatSourcesDrawerProps) {
  const open = useSettingsStore((state) => state.sourcesPanelOpen);
  const setOpen = useSettingsStore((state) => state.setSourcesPanelOpen);
  const setSettingsOpen = useSettingsStore((state) => state.setSettingsOpen);
  const { sources, loading, error, refresh, removeSource } = useCollectionSources(
    open ? collectionName : null,
  );

  const handleDelete = async (sourcePath: string) => {
    const removed = await removeSource(sourcePath);
    const fileName = sourcePath.split(/[/\\]/).pop() ?? "File";
    toast(`Removed ${fileName} (${removed} chunks)`, "success");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetContent
        side="right"
        aria-labelledby="chat-sources-title"
        className="panel-enter"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById("chat-sources-close")?.focus();
        }}
      >
        <div className="flex items-center justify-between border-b border-mist px-6 py-4">
          <div className="min-w-0">
            <SheetTitle id="chat-sources-title">Sources</SheetTitle>
            <SheetDescription className="mt-0.5 truncate">
              {formatCollectionName(collectionName)}
              {!loading && sources.length > 0
                ? ` · ${sources.length} file${sources.length === 1 ? "" : "s"}`
                : ""}
            </SheetDescription>
          </div>
          <button
            id="chat-sources-close"
            type="button"
            onClick={() => setOpen(false)}
            className="app-control-icon inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-carbon hover:bg-paper-white"
            aria-label="Close sources panel"
          >
            <XMarkIcon aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <section aria-labelledby="indexed-sources-heading">
            <div className="flex items-center justify-between gap-3">
              <h3 id="indexed-sources-heading" className="type-label text-forest-teal">
                Indexed files
              </h3>
              <Button variant="ghost" className="h-9 min-h-9 px-3" onClick={() => void refresh()}>
                Refresh
              </Button>
            </div>
            <p className="mt-1 type-caption text-helper">
              Click a file to preview. Remove files you no longer want in answers.
            </p>
            <CollectionSourcesList
              className="mt-4"
              sources={sources}
              loading={loading}
              error={error}
              onPreview={onPreview}
              onDelete={handleDelete}
              onRefresh={() => void refresh()}
            />
          </section>

          <section className="mt-8 border-t border-mist pt-8" aria-labelledby="sources-settings-link">
            <h3 id="sources-settings-link" className="type-label text-forest-teal">
              Retrieval & formats
            </h3>
            <p className="mt-1 type-caption text-helper">
              Adjust how many chunks are retrieved per answer and see supported file types in Settings.
            </p>
            <Button
              variant="ghost"
              className="mt-4 h-9 min-h-9 px-3"
              icon={<Cog6ToothIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
            >
              Open Settings
            </Button>
          </section>
        </div>

        <div className="border-t border-mist px-6 py-4">
          <Button variant="primary" fullWidth onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useState } from "react";
import { MoonIcon, SunIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CollectionSourcesList } from "./CollectionSourcesList";
import { SourcePreviewModal } from "./SourcePreviewModal";
import { useCollectionSources } from "../hooks/useCollectionSources";
import { formatCollectionName } from "../lib/format";
import { NXTRIVE_REPLAY_WELCOME } from "../lib/app-events";
import { SUPPORTED_FORMAT_GROUPS } from "../lib/supported-formats";
import { useAppStore } from "../store/useAppStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { toast } from "../store/useToastStore";
import type { ThemeMode } from "../lib/storage";
import { Button } from "./ui/Button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "./ui/sheet";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function SettingsPanel() {
  const open = useSettingsStore((s) => s.settingsOpen);
  const setOpen = useSettingsStore((s) => s.setSettingsOpen);
  const topK = useSettingsStore((s) => s.topK);
  const setTopK = useSettingsStore((s) => s.setTopK);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const currentCollection = useAppStore((s) => s.currentCollection);
  const [previewSourcePath, setPreviewSourcePath] = useState<string | null>(null);
  const { sources, loading, error, refresh, removeSource } = useCollectionSources(
    open ? currentCollection : null,
  );

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen} modal={false}>
        <SheetContent
          side="right"
          aria-labelledby="settings-title"
          className="panel-enter"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const closeBtn = document.getElementById("settings-close");
            closeBtn?.focus();
          }}
        >
          <div className="flex items-center justify-between border-b border-mist px-6 py-4">
            <SheetTitle id="settings-title">Settings</SheetTitle>
            <button
              id="settings-close"
              type="button"
              onClick={() => setOpen(false)}
              className="app-control-icon inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-carbon hover:bg-paper-white"
              aria-label="Close settings"
            >
              <XMarkIcon aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <section aria-labelledby="appearance-heading">
              <h3 id="appearance-heading" className="type-label text-forest-teal">
                Appearance
              </h3>
              <SheetDescription className="mt-1">Theme for the app interface</SheetDescription>
              <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
                {THEME_OPTIONS.map((option) => {
                  const active = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTheme(option.value)}
                      className={[
                        "flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 type-caption transition-colors",
                        active
                          ? "border-deep-indigo/40 surface-accent-soft text-deep-ink"
                          : "border-mist bg-card-white text-carbon hover:border-fog",
                      ].join(" ")}
                    >
                      {option.value === "dark" ? (
                        <MoonIcon className="h-6 w-6" aria-hidden="true" />
                      ) : option.value === "light" ? (
                        <SunIcon className="h-6 w-6" aria-hidden="true" />
                      ) : (
                        <span className="type-mono-xs" aria-hidden="true">
                          Auto
                        </span>
                      )}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-8 border-t border-mist pt-8" aria-labelledby="retrieval-heading">
              <h3 id="retrieval-heading" className="type-label text-forest-teal">
                Retrieval
              </h3>
              <p className="mt-1 type-caption text-helper">
                More sources can improve answers but may slow responses
              </p>
              <div className="mt-4">
                <label htmlFor="top-k" className="type-body-sm font-medium text-deep-ink">
                  Sources per answer: {topK}
                </label>
                <input
                  id="top-k"
                  type="range"
                  min={1}
                  max={15}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="mt-2 w-full accent-deep-indigo"
                  aria-valuemin={1}
                  aria-valuemax={15}
                  aria-valuenow={topK}
                  aria-describedby="top-k-help"
                />
                <p id="top-k-help" className="sr-only">
                  Choose how many document chunks to include in each answer, from 1 to 15
                </p>
                <div className="mt-1 flex justify-between type-mono-xs text-helper">
                  <span>1</span>
                  <span>15</span>
                </div>
              </div>
            </section>

            {currentCollection && (
              <section className="mt-8 border-t border-mist pt-8" aria-labelledby="library-sources-heading">
                <h3 id="library-sources-heading" className="type-label text-forest-teal">
                  Library sources
                </h3>
                <p className="mt-1 type-caption text-helper">
                  Files indexed in {formatCollectionName(currentCollection)}
                </p>
                <CollectionSourcesList
                  className="mt-4"
                  sources={sources}
                  loading={loading}
                  error={error}
                  onPreview={setPreviewSourcePath}
                  onDelete={async (sourcePath) => {
                    const removed = await removeSource(sourcePath);
                    const fileName = sourcePath.split(/[/\\]/).pop() ?? "File";
                    toast(`Removed ${fileName} (${removed} chunks)`, "success");
                  }}
                  onRefresh={() => void refresh()}
                />
              </section>
            )}

            <section className="mt-8 border-t border-mist pt-8" aria-labelledby="formats-heading">
              <h3 id="formats-heading" className="type-label text-forest-teal">
                Supported formats
              </h3>
              <p className="mt-1 type-caption text-helper">
                PDF and DOCX preview in-app. Legacy .doc is not supported — save as .docx.
              </p>
              <dl className="mt-4 space-y-3">
                {SUPPORTED_FORMAT_GROUPS.map((group) => (
                  <div key={group.label}>
                    <dt className="type-caption text-helper">{group.label}</dt>
                    <dd className="mt-1 type-body-sm text-deep-ink">
                      {group.extensions.map((ext) => ext.slice(1).toUpperCase()).join(", ")}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mt-8 border-t border-mist pt-8" aria-labelledby="help-heading">
              <h3 id="help-heading" className="type-label text-forest-teal">
                Help
              </h3>
              <p className="mt-1 type-caption text-helper">Replay the first-run welcome tour</p>
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent(NXTRIVE_REPLAY_WELCOME));
                }}
              >
                Replay welcome tour
              </Button>
            </section>

            <section className="mt-8 border-t border-mist pt-8" aria-labelledby="about-heading">
              <h3 id="about-heading" className="type-label text-forest-teal">
                About
              </h3>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="type-caption text-helper">Chunk size</dt>
                  <dd className="type-body-sm text-deep-ink">512 tokens (backend default)</dd>
                </div>
                <div>
                  <dt className="type-caption text-helper">Embedding model</dt>
                  <dd className="type-body-sm text-deep-ink">nomic-embed-text</dd>
                </div>
                <div>
                  <dt className="type-caption text-helper">LLM</dt>
                  <dd className="type-body-sm text-deep-ink">llama3 via Ollama</dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="border-t border-mist px-6 py-4">
            <Button variant="primary" fullWidth onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {currentCollection && (
        <SourcePreviewModal
          open={previewSourcePath !== null}
          collectionName={currentCollection}
          sourcePath={previewSourcePath}
          onClose={() => setPreviewSourcePath(null)}
        />
      )}
    </>
  );
}

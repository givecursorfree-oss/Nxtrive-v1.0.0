import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  HomeIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";

import { BrandLogoMark } from "./BrandLogo";

import { BRAND_NAME } from "../lib/brand";
import { resolveTheme } from "../lib/theme";
import { buildBreadcrumbs, navigateHome } from "../lib/navigation";
import type { OllamaStatus } from "../lib/api";
import { getCachedBackendPort } from "../lib/api-base";
import { openOllamaInstallPage } from "../lib/ollama-install";
import { useAppStore } from "../store/useAppStore";
import { useOllamaStatus } from "../hooks/useOllamaStatus";
import { useSettingsStore } from "../store/useSettingsStore";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Bb8ThemeToggle } from "./ui/Bb8ThemeToggle";

interface StatusBarProps {
  backendOnline: boolean | null;
  backendLoading?: boolean;
  retrying?: boolean;
  onRetry?: () => void;
  welcomeOpen?: boolean;
}

export function StatusBar({
  backendOnline,
  backendLoading = false,
  retrying = false,
  onRetry,
  welcomeOpen = false,
}: StatusBarProps) {
  const currentCollection = useAppStore((state) => state.currentCollection);
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  const setShortcutsOpen = useSettingsStore((s) => s.setShortcutsOpen);
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);
  const shortcutsOpen = useSettingsStore((s) => s.shortcutsOpen);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const { status, loading: ollamaLoading } = useOllamaStatus();
  const apiPort = backendOnline ? getCachedBackendPort() : null;
  const isDark = resolveTheme(theme) === "dark";

  const ollamaLabel = getOllamaStatusLabel(status);
  const ollamaOk = Boolean(status?.ready);
  const backendOk = backendOnline === true;
  const systemLoading = backendLoading || ollamaLoading;
  const systemHealthy = backendOk && ollamaOk;
  const modelName = status?.models?.find((m) => m.includes("llama")) ?? status?.models?.[0];

  const breadcrumbs = buildBreadcrumbs({
    collection: currentCollection,
    settingsOpen,
    shortcutsOpen,
    welcomeOpen,
  });

  return (
    <header className="surface-glass relative z-[350] shrink-0 border-b border-mist">
      <div className="flex h-14 items-center justify-between gap-4 panel-x">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={navigateHome}
            className="inline-flex shrink-0 items-center justify-center rounded-card transition-colors hover:bg-paper-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-indigo/25"
            aria-label="Go home"
            title="Go home"
          >
            <BrandLogoMark framed frameSize="lg" />
          </button>
          <Button
            variant="ghost"
            onClick={navigateHome}
            icon={<HomeIcon className="h-5 w-5 shrink-0" aria-hidden="true" />}
            className="h-10 min-h-10 shrink-0 px-3"
          >
            Home
          </Button>
          <AppBreadcrumb
            items={breadcrumbs}
            className="type-body-sm"
            onNavigate={(id) => {
              if (id === "home") navigateHome();
            }}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {systemLoading && (
            <span className="status-pill" role="status" aria-live="polite">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-fog" aria-hidden />
              Checking status…
            </span>
          )}

          {!systemLoading && !systemHealthy && (
            <div className="hidden items-center gap-2 lg:flex" role="status" aria-label="System status">
              <StatusPill
                ok={backendOk}
                label={backendOk ? "Backend online" : "Backend offline"}
              />
              <StatusPill
                ok={ollamaOk}
                label={ollamaLabel}
              />
              <span className="status-pill" title={`${BRAND_NAME} local API port`}>
                Local API{apiPort ? ` · ${apiPort}` : ""}
              </span>
            </div>
          )}

          {!systemLoading && systemHealthy && (
            <div className="hidden items-center gap-2 lg:flex" role="status" aria-label="System status">
              <StatusPill ok label="Online" />
              {modelName && (
                <Badge variant="source" className="h-10 rounded-card px-3 py-0">
                  {modelName}
                </Badge>
              )}
            </div>
          )}

          {!systemLoading && !systemHealthy && !backendOk && onRetry && (
            <Button
              variant="ghost"
              loading={retrying}
              onClick={onRetry}
              icon={<ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              className="h-10 min-h-10 px-4"
            >
              <span className="hidden sm:inline">Retry</span>
              <span className="sr-only sm:hidden">Retry backend connection</span>
            </Button>
          )}

          {!systemLoading && !ollamaOk && status && !status.installed && (
            <Button
              variant="ghost"
              className="hidden h-10 min-h-10 px-4 sm:inline-flex"
              onClick={() => void openOllamaInstallPage(status.install_url)}
              icon={<SignalIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              iconRight={<ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
            >
              Install Ollama
            </Button>
          )}

          <Bb8ThemeToggle
            isDark={isDark}
            onChange={(dark) => setTheme(dark ? "dark" : "light")}
            size={5}
            className="bb8-theme-toggle--header"
          />
          <Button
            variant="ghost"
            className="h-10 min-h-10 px-4"
            onClick={() => setShortcutsOpen(!shortcutsOpen)}
            aria-label="Keyboard shortcuts"
            aria-pressed={shortcutsOpen}
          >
            <span className="hidden sm:inline">Shortcuts</span>
            <span className="sm:hidden">?</span>
          </Button>
          <Button
            variant="ghost"
            className="h-10 min-h-10 px-4"
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-pressed={settingsOpen}
          >
            Settings
          </Button>
        </div>
      </div>

      {!systemLoading && !systemHealthy && (
        <div
          role="alert"
          aria-live="polite"
          className="flex flex-wrap items-center gap-2 border-t border-mist bg-paper-white panel-x py-2 lg:hidden"
        >
          <StatusPill ok={backendOk} label={backendOk ? "Backend online" : "Backend offline"} />
          <StatusPill ok={ollamaOk} label={ollamaLabel} />
          <span className="status-pill" title={`${BRAND_NAME} local API port`}>
            Local API{apiPort ? ` · ${apiPort}` : ""}
          </span>
          {!backendOk && onRetry && (
            <Button
              variant="ghost"
              loading={retrying}
              onClick={onRetry}
              icon={<ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              className="h-10 min-h-10 px-4"
            >
              Retry
            </Button>
          )}
          {!ollamaOk && status && !status.installed && (
            <Button
              variant="ghost"
              className="h-10 min-h-10 px-4"
              onClick={() => void openOllamaInstallPage(status.install_url)}
              icon={<SignalIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
            >
              Install Ollama
            </Button>
          )}
        </div>
      )}
    </header>
  );
}

function getOllamaStatusLabel(status: OllamaStatus | null): string {
  if (!status) return "Ollama unknown";
  if (status.ready) return "Ollama ready";
  if (!status.installed) return "Ollama not installed";
  if (!status.running) return "Ollama stopped";
  if (status.missing_models.length > 0) {
    return `Missing: ${status.missing_models.join(", ")}`;
  }
  return "Ollama not ready";
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={ok ? "status-pill" : "status-pill status-pill--error"}>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-mint" : "bg-ember-orange"}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

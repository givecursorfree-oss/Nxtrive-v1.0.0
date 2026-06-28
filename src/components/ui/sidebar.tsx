import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentPlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  ChevronsUpDown,
  FolderOpen,
  MessagesSquare,
  Pin,
  PinOff,
} from "lucide-react";
import { motion, LayoutGroup } from "motion/react";

import { BrandLogoMark } from "@/components/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";
import {
  NXTRIVE_EXPAND_SIDEBAR,
  NXTRIVE_FOLDER_DROP,
  NXTRIVE_PICK_FILES,
  NXTRIVE_PICK_FOLDER,
  NXTRIVE_REPLAY_WELCOME,
} from "@/lib/app-events";
import { navigateHome } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { deleteCollection, fetchCollections } from "@/lib/api";
import {
  deriveCollectionNameFromPath,
  getCollectionFolderPath,
  removeCollectionFolderPath,
  resolveFileIngestCollection,
} from "@/lib/folders";
import { formatCollectionName, formatChunkCount } from "@/lib/format";
import { requestFolderAccess } from "@/lib/folder-access";
import { pickFolder } from "@/lib/pick-folder";
import { pickFiles } from "@/lib/pick-files";
import { deleteChatHistory } from "@/lib/storage";
import { useIngest } from "@/hooks/useIngest";
import { useAppStore } from "@/store/useAppStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { toast } from "@/store/useToastStore";
import { IngestionStatus } from "../IngestionStatus";
import { ConfirmDialog } from "./ConfirmDialog";
import { Button } from "./Button";
import { Input } from "./Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { ScrollArea } from "./scroll-area";
import { Separator } from "./separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const sidebarVariants = {
  open: { width: "var(--sidebar-width)" },
  closed: { width: "4.5rem" },
};

const labelVariants = {
  open: {
    x: 0,
    opacity: 1,
    transition: { x: { stiffness: 1000, velocity: -100 } },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: { x: { stiffness: 100 } },
  },
};

const transitionProps = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.2,
};

function useIsDesktop() {
  return true;
}

interface NavRowProps {
  icon: ReactNode;
  label: string;
  /** Tooltip when sidebar is collapsed; defaults to label + optional suffix */
  tooltip?: string;
  active?: boolean;
  collapsed: boolean;
  onClick?: () => void;
  badge?: ReactNode;
  showCollectionDot?: boolean;
  className?: string;
}

function NavRow({
  icon,
  label,
  tooltip,
  active,
  collapsed,
  onClick,
  badge,
  showCollectionDot,
  className,
}: NavRowProps) {
  const tooltipText =
    tooltip ?? (active ? `${label} · current view` : label);

  const button = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full flex-row items-center text-left transition-colors duration-200 ease-out",
        "text-slate hover:bg-paper-white hover:text-deep-ink",
        collapsed ? "mx-auto h-11 w-11 min-h-11 min-w-11 justify-center rounded-card" : "min-h-[44px] rounded-card px-2 py-2",
        active && "text-deep-indigo",
        active && collapsed && "bg-pale-cyan-muted/55",
        active && !collapsed && "bg-pale-cyan-muted/35",
        className
      )}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      {!collapsed && active && (
        <span
          className="absolute left-0 top-1/2 z-10 h-5 w-0.5 -translate-y-1/2 rounded-full bg-forest-teal"
          aria-hidden
        />
      )}
      <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center [&_svg]:h-6 [&_svg]:w-6 [&_svg]:shrink-0">
        {icon}
        {showCollectionDot && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-forest-teal ring-2 ring-card-white"
            aria-hidden
          />
        )}
      </span>
      <motion.span
        variants={labelVariants}
        animate={collapsed ? "closed" : "open"}
        className="relative z-10 flex min-w-0 items-center gap-2 overflow-hidden"
      >
        {!collapsed && (
          <>
            <span className="ml-2 truncate type-body-sm font-medium">{label}</span>
            {badge}
            {active && (
              <span className="sr-only">Current view</span>
            )}
          </>
        )}
      </motion.span>
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

function SidebarPinToggle({
  isPinned,
  collapsed,
  onToggle,
}: {
  isPinned: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "sidebar-pin-btn inline-flex shrink-0 items-center justify-center rounded-card text-slate transition-colors duration-200 ease-out hover:bg-paper-white hover:text-deep-ink",
            collapsed ? "h-10 w-10 min-h-10 min-w-10" : "h-10 w-10 min-h-10 min-w-10",
            isPinned && "bg-pale-cyan-muted/55 text-forest-teal",
          )}
          aria-pressed={isPinned}
          aria-label={isPinned ? "Collapse sidebar to icons" : "Pin sidebar open"}
        >
          {isPinned ? (
            <PinOff className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <Pin className="h-5 w-5 shrink-0" aria-hidden />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {isPinned ? "Collapse to icons" : "Pin sidebar open"}
      </TooltipContent>
    </Tooltip>
  );
}

export function SessionNavBar() {
  const collections = useAppStore((state) => state.collections);
  const currentCollection = useAppStore((state) => state.currentCollection);
  const setCollection = useAppStore((state) => state.setCollection);
  const setCollections = useAppStore((state) => state.setCollections);
  const ingestionState = useAppStore((state) => state.ingestionState);

  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);
  const shortcutsOpen = useSettingsStore((s) => s.shortcutsOpen);
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);

  const isDesktop = useIsDesktop();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const isPinned = !sidebarCollapsed;
  const collapsed = isDesktop ? sidebarCollapsed && !hoverExpanded : false;

  const closeWorkspaceMenu = useCallback(() => setWorkspaceMenuOpen(false), []);

  const replayWelcomeTour = useCallback(() => {
    closeWorkspaceMenu();
    window.dispatchEvent(new CustomEvent(NXTRIVE_REPLAY_WELCOME));
  }, [closeWorkspaceMenu]);

  const openSettingsFromMenu = useCallback(() => {
    closeWorkspaceMenu();
    setSettingsOpen(true);
  }, [closeWorkspaceMenu, setSettingsOpen]);

  const goHomeFromMenu = useCallback(() => {
    closeWorkspaceMenu();
    navigateHome();
  }, [closeWorkspaceMenu]);

  const libraryLabel = currentCollection
    ? formatCollectionName(currentCollection)
    : "Library";
  const libraryTooltip = currentCollection
    ? `Library · ${formatCollectionName(currentCollection)}`
    : "Library · add documents";

  const [folderPath, setFolderPath] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { ingestFolder, ingestDroppedFolder } = useIngest();

  useEffect(() => {
    void fetchCollections()
      .then(setCollections)
      .catch(() => undefined);
  }, [setCollections]);

  useEffect(() => {
    const onExpand = () => setSidebarCollapsed(false);
    window.addEventListener(NXTRIVE_EXPAND_SIDEBAR, onExpand);
    return () => window.removeEventListener(NXTRIVE_EXPAND_SIDEBAR, onExpand);
  }, [setSidebarCollapsed]);

  const filteredCollections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        formatCollectionName(c.name).toLowerCase().includes(q)
    );
  }, [collections, searchQuery]);

  const applyFolderPath = useCallback((path: string) => {
    const trimmed = path.trim();
    if (!trimmed) return;
    setFolderPath(trimmed);
    setCollectionName(deriveCollectionNameFromPath(trimmed));
  }, []);

  useEffect(() => {
    const onFolderDrop = (event: Event) => {
      const path = (event as CustomEvent<string>).detail;
      if (path) applyFolderPath(path);
    };
    window.addEventListener(NXTRIVE_FOLDER_DROP, onFolderDrop);
    return () => window.removeEventListener(NXTRIVE_FOLDER_DROP, onFolderDrop);
  }, [applyFolderPath]);

  const handlePickFolder = useCallback(async () => {
    const allowed = await requestFolderAccess();
    if (!allowed) return;

    try {
      const result = await pickFolder();
      if (!result) return;

      if (result.kind === "path") {
        applyFolderPath(result.path);
        const collectionName = deriveCollectionNameFromPath(result.path);
        toast(`Indexing ${collectionName.replace(/_/g, " ")}…`, "info");
        await ingestFolder(result.path, collectionName);
        return;
      }

      const { rootName, files } = result.folder;
      const targetCollection = resolveFileIngestCollection(
        currentCollection,
        collectionName,
        rootName,
      );
      applyFolderPath(`${rootName} (${files.length} files)`);
      setCollectionName(targetCollection);
      const toastLabel = currentCollection
        ? `Adding ${files.length} file${files.length === 1 ? "" : "s"} to ${formatCollectionName(currentCollection)}…`
        : `Uploading ${files.length} file${files.length === 1 ? "" : "s"}…`;
      toast(toastLabel, "info");
      await ingestDroppedFolder(rootName, files, targetCollection);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message =
        error instanceof Error ? error.message : "Could not open folder picker";
      toast(message, "error");
    }
  }, [applyFolderPath, collectionName, currentCollection, ingestDroppedFolder, ingestFolder]);

  const handlePickFiles = useCallback(async () => {
    try {
      const result = await pickFiles();
      if (result.status === "cancelled") return;
      if (result.status === "unsupported") {
        toast("No supported file types selected", "error");
        return;
      }

      const { rootName, files } = result;
      const label =
        files.length === 1 ? files[0].file.name : `${files.length} files selected`;
      setFolderPath(label);

      const targetCollection = resolveFileIngestCollection(
        currentCollection,
        collectionName,
        rootName,
      );
      setCollectionName(targetCollection);

      const toastLabel = currentCollection
        ? `Adding ${files.length} file${files.length === 1 ? "" : "s"} to ${formatCollectionName(currentCollection)}…`
        : `Indexing ${files.length} file${files.length === 1 ? "" : "s"}…`;
      toast(toastLabel, "info");
      await ingestDroppedFolder(rootName, files, targetCollection);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message =
        error instanceof Error ? error.message : "Could not open file picker";
      toast(message, "error");
    }
  }, [collectionName, currentCollection, ingestDroppedFolder]);

  useEffect(() => {
    const onPickFolder = () => {
      void handlePickFolder();
    };
    window.addEventListener(NXTRIVE_PICK_FOLDER, onPickFolder);
    return () => window.removeEventListener(NXTRIVE_PICK_FOLDER, onPickFolder);
  }, [handlePickFolder]);

  useEffect(() => {
    const onPickFiles = () => {
      void handlePickFiles();
    };
    window.addEventListener(NXTRIVE_PICK_FILES, onPickFiles);
    return () => window.removeEventListener(NXTRIVE_PICK_FILES, onPickFiles);
  }, [handlePickFiles]);

  const handleIngest = async () => {
    if (!folderPath.trim() || !collectionName.trim()) return;
    await ingestFolder(folderPath.trim(), collectionName.trim());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCollection(deleteTarget);
      removeCollectionFolderPath(deleteTarget);
      deleteChatHistory(deleteTarget);
      const updated = await fetchCollections();
      setCollections(updated);
      if (currentCollection === deleteTarget) {
        setCollection(null);
      }
      toast("Collection deleted", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete collection";
      toast(message, "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleReindex = async (name: string) => {
    const savedPath = getCollectionFolderPath(name);
    if (!savedPath) {
      toast("Original folder path not saved. Re-add the folder to refresh.", "info");
      return;
    }
    await ingestFolder(savedPath, name);
  };

  const isIngesting = ingestionState.status === "running";

  return (
    <>
      <TooltipProvider delayDuration={250}>
      <motion.aside
        className={cn(
          "z-40 flex h-full min-w-0 shrink-0 flex-col overflow-hidden border-r border-mist surface-glass",
        )}
        initial={false}
        animate={isDesktop ? (collapsed ? "closed" : "open") : "open"}
        variants={sidebarVariants}
        transition={transitionProps}
        onMouseEnter={() => isDesktop && sidebarCollapsed && setHoverExpanded(true)}
        onMouseLeave={() => isDesktop && setHoverExpanded(false)}
        aria-label="Document library"
      >
        <div className="flex h-full min-h-0 flex-col text-slate">
          <div
            className={cn(
              "flex h-14 w-full shrink-0 items-center border-b border-mist p-2",
              collapsed ? "justify-center" : "gap-1",
            )}
          >
            {collapsed ? (
              <DropdownMenu open={workspaceMenuOpen} onOpenChange={setWorkspaceMenuOpen}>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-card transition-colors hover:bg-paper-white"
                        aria-label={`${BRAND_NAME} workspace menu`}
                        aria-expanded={workspaceMenuOpen}
                      >
                        <BrandLogoMark framed frameSize="sm" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {BRAND_NAME} · workspace menu
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onSelect={goHomeFromMenu}>
                    Go home
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={replayWelcomeTour}>
                    Replay welcome tour
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={openSettingsFromMenu}>
                    Open settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu open={workspaceMenuOpen} onOpenChange={setWorkspaceMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-sm transition-colors hover:bg-paper-white"
                    aria-expanded={workspaceMenuOpen}
                    aria-haspopup="menu"
                  >
                    <BrandLogoMark framed frameSize="md" />
                    <motion.span
                      variants={labelVariants}
                      animate="open"
                      className="flex min-w-0 items-center gap-2"
                    >
                      <span className="truncate font-medium text-deep-ink">{BRAND_NAME}</span>
                      <ChevronsUpDown className="h-6 w-6 shrink-0 opacity-50" aria-hidden />
                    </motion.span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onSelect={goHomeFromMenu}>
                    Go home
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={replayWelcomeTour}>
                    Replay welcome tour
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={openSettingsFromMenu}>
                    Open settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isDesktop && !collapsed && (
              <SidebarPinToggle
                isPinned={isPinned}
                collapsed={collapsed}
                onToggle={() => setSidebarCollapsed(isPinned)}
              />
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <LayoutGroup>
            <ScrollArea className="min-h-[120px] min-w-0 flex-1 p-2">
              <div className="flex w-full min-w-0 flex-col gap-2">
                <NavRow
                  icon={<MessagesSquare className="h-6 w-6 shrink-0" strokeWidth={1.75} />}
                  label="Chat"
                  tooltip={!settingsOpen && !shortcutsOpen ? "Chat · current view" : "Chat"}
                  active={!settingsOpen && !shortcutsOpen}
                  collapsed={collapsed}
                  onClick={() => navigateHome()}
                />

                {collapsed ? (
                  <NavRow
                    icon={<FolderOpen className="h-6 w-6 shrink-0" strokeWidth={1.75} />}
                    label={libraryLabel}
                    tooltip={libraryTooltip}
                    showCollectionDot={Boolean(currentCollection)}
                    active={false}
                    collapsed={collapsed}
                    onClick={() => {
                      setSettingsOpen(false);
                      setSidebarCollapsed(false);
                    }}
                  />
                ) : (
                  <>
                <Separator className="my-2" />
                  <div className="min-w-0 space-y-3 px-1 py-1">
                    <h2 className="type-label text-forest-teal">Library</h2>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        variant="ghost"
                        fullWidth
                        disabled={isIngesting}
                        onClick={() => void handlePickFolder()}
                        icon={<FolderOpen className="h-4 w-4 shrink-0" aria-hidden />}
                      >
                        Choose folder
                      </Button>
                      <Button
                        variant="ghost"
                        fullWidth
                        disabled={isIngesting}
                        onClick={() => void handlePickFiles()}
                        icon={<DocumentPlusIcon className="h-4 w-4 shrink-0" aria-hidden />}
                      >
                        Choose files
                      </Button>
                    </div>

                    {currentCollection && !isIngesting && (
                      <p className="text-pretty text-center text-helper leading-snug">
                        Files upload to{" "}
                        <span className="font-medium text-deep-ink">
                          {formatCollectionName(currentCollection)}
                        </span>
                      </p>
                    )}

                    {folderPath && !isIngesting && (
                      <p
                        className="break-all rounded-lg bg-paper-white px-3 py-2 type-caption text-helper"
                        title={folderPath}
                      >
                        {folderPath}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="flex w-full min-h-[44px] min-w-0 items-center justify-between gap-2 rounded-lg px-2 type-caption text-helper hover:bg-paper-white"
                      aria-expanded={showAdvanced}
                    >
                      <span className="min-w-0 truncate">Advanced options</span>
                      {showAdvanced ? (
                        <ChevronUpIcon className="h-5 w-5 shrink-0" aria-hidden />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 shrink-0" aria-hidden />
                      )}
                    </button>

                    {showAdvanced && (
                      <div className="min-w-0 space-y-2">
                        <Input
                          label="Folder path"
                          value={folderPath}
                          onChange={(e) => setFolderPath(e.target.value)}
                          onBlur={(e) => applyFolderPath(e.target.value)}
                          placeholder="C:\Users\you\Documents"
                        />
                        <Input
                          label="Collection name"
                          value={collectionName}
                          onChange={(e) => setCollectionName(e.target.value)}
                          placeholder="my_documents"
                        />
                      </div>
                    )}

                    {!isIngesting && (
                      <Button
                        fullWidth
                        disabled={!folderPath.trim() || !collectionName.trim()}
                        onClick={() => void handleIngest()}
                        icon={<ArrowUpTrayIcon className="h-4 w-4 shrink-0" aria-hidden />}
                      >
                        Add & index documents
                      </Button>
                    )}

                    {!isIngesting && (
                      <p className="min-w-0 text-pretty text-center text-helper leading-snug">
                        or drag files or a folder onto the window
                      </p>
                    )}

                    <IngestionStatus />

                    <div className="pt-2">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="type-label text-forest-teal">Collections</h3>
                        <span className="type-caption text-helper">{collections.length}</span>
                      </div>

                      {collections.length > 3 && (
                        <div className="relative mb-2">
                          <MagnifyingGlassIcon
                            className="pointer-events-none absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search…"
                            aria-label="Search collections"
                            className="surface-input w-full py-2 pl-8 pr-3 type-body-sm"
                          />
                        </div>
                      )}

                      {collections.length === 0 ? (
                        <p className="type-body-sm text-slate">No collections yet</p>
                      ) : filteredCollections.length === 0 ? (
                        <p className="type-body-sm text-slate">No matches</p>
                      ) : (
                        <ul className="space-y-2" role="list">
                          {filteredCollections.map((collection) => {
                            const active = currentCollection === collection.name;
                            return (
                              <li key={collection.name}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCollection(collection.name);
                                    setSettingsOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full min-h-[44px] flex-col rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:bg-paper-white",
                                    active &&
                                      "border-deep-indigo/25 bg-pale-cyan-muted ring-1 ring-deep-indigo/10"
                                  )}
                                  aria-current={active ? "true" : undefined}
                                >
                                  <span className="truncate type-body-sm font-medium text-deep-ink">
                                    {formatCollectionName(collection.name)}
                                  </span>
                                  <span
                                    className={cn(
                                      "type-caption",
                                      collection.document_count === 0
                                        ? "text-ember-orange"
                                        : "text-slate",
                                    )}
                                  >
                                    {formatChunkCount(collection.document_count)}
                                  </span>
                                </button>
                                <div className="mt-1 flex flex-wrap gap-1 px-1">
                                  {getCollectionFolderPath(collection.name) && (
                                    <button
                                      type="button"
                                      onClick={() => void handleReindex(collection.name)}
                                      disabled={isIngesting}
                                      className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 type-caption text-forest-teal hover:bg-paper-white disabled:opacity-50"
                                    >
                                      <ArrowPathIcon className="h-5 w-5 shrink-0" aria-hidden />
                                      Refresh
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(collection.name)}
                                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 type-caption text-ember-orange hover:bg-ember-orange/5"
                                    aria-label={`Delete ${formatCollectionName(collection.name)}`}
                                  >
                                    <TrashIcon className="h-5 w-5 shrink-0" aria-hidden />
                                    Delete
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                  </>
                )}
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t border-mist p-2">
              {collapsed && isDesktop && (
                <div className="mb-1 flex justify-center">
                  <SidebarPinToggle
                    isPinned={isPinned}
                    collapsed={collapsed}
                    onToggle={() => setSidebarCollapsed(isPinned)}
                  />
                </div>
              )}
            </div>
            </LayoutGroup>
          </div>
        </div>
      </motion.aside>
      </TooltipProvider>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete collection?"
        description={`"${deleteTarget ? formatCollectionName(deleteTarget) : ""}" and all indexed chunks will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

/** @deprecated Use SessionNavBar — kept for existing imports */
export const Sidebar = SessionNavBar;

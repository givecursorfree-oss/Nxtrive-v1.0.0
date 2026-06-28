import {
  ChatBubbleLeftRightIcon,
  DocumentPlusIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import { formatCollectionName } from "../lib/format";
import {
  NXTRIVE_EXPAND_SIDEBAR,
  NXTRIVE_PICK_FILES,
  NXTRIVE_PICK_FOLDER,
} from "../lib/app-events";
import { useAppStore } from "../store/useAppStore";
import { Button } from "./ui/Button";
import { ChatEmptyHero } from "./ChatEmptyHero";

const ACTION_CARDS = [
  {
    id: "folder",
    icon: FolderOpenIcon,
    title: "Index a folder",
    description: "Choose a folder from the Library panel to index every supported file inside",
    cta: "Choose folder",
  },
  {
    id: "files",
    icon: DocumentPlusIcon,
    title: "Upload files",
    description: "Pick one or more documents to index without selecting a parent folder",
    cta: "Choose files",
  },
  {
    id: "library",
    icon: ChatBubbleLeftRightIcon,
    title: "Already indexed?",
    description: "Select a collection in the sidebar to start chatting",
    cta: "View collections",
  },
] as const;

interface EmptyChatStateProps {
  hasCollection: boolean;
  hasCollections: boolean;
  collectionName?: string | null;
  onDismissOnboarding?: () => void;
  showOnboarding: boolean;
}

function ActionCard({
  icon: Icon,
  title,
  description,
  cta,
  onClick,
}: {
  icon: typeof FolderOpenIcon;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="action-card flex h-full min-h-[128px] flex-col items-start gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-indigo/25"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-card bg-pale-cyan-muted text-forest-teal shadow-subtle-3">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="space-y-1">
        <span className="block type-body font-semibold text-deep-ink">{title}</span>
        <span className="block type-body-sm text-muted">{description}</span>
      </span>
      <span className="mt-auto type-caption font-medium text-deep-indigo">{cta} →</span>
    </button>
  );
}

function openLibrarySidebar() {
  window.dispatchEvent(new CustomEvent(NXTRIVE_EXPAND_SIDEBAR));
}

function openFolderPicker() {
  window.dispatchEvent(new CustomEvent(NXTRIVE_EXPAND_SIDEBAR));
  window.dispatchEvent(new CustomEvent(NXTRIVE_PICK_FOLDER));
}

function openFilePicker() {
  window.dispatchEvent(new CustomEvent(NXTRIVE_EXPAND_SIDEBAR));
  window.dispatchEvent(new CustomEvent(NXTRIVE_PICK_FILES));
}

function actionForCard(id: (typeof ACTION_CARDS)[number]["id"]) {
  if (id === "folder") return openFolderPicker;
  if (id === "files") return openFilePicker;
  return openLibrarySidebar;
}

export function EmptyChatState({
  hasCollection,
  hasCollections,
  collectionName,
  onDismissOnboarding,
  showOnboarding,
}: EmptyChatStateProps) {
  const collections = useAppStore((s) => s.collections);

  if (!hasCollections) {
    return (
      <div className="flex w-full flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl panel-enter">
          <div className="text-center">
            <h2 className="type-heading-lg font-semibold text-deep-ink">Build your private library</h2>
            <p className="mx-auto mt-3 max-w-md type-body text-slate">
              Index documents locally. Nothing leaves your machine.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACTION_CARDS.map((card) => (
              <ActionCard
                key={card.id}
                icon={card.icon}
                title={card.title}
                description={card.description}
                cta={card.cta}
                onClick={actionForCard(card.id)}
              />
            ))}
          </div>

          <p className="mt-6 text-center text-helper">
            Tip: drag files or a folder onto the window to index faster
          </p>
        </div>
      </div>
    );
  }

  if (!hasCollection) {
    return (
      <div className="flex w-full flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md text-center panel-enter">
          <h2 className="type-heading font-semibold text-deep-ink">Select a collection</h2>
          <p className="mt-3 type-body text-slate">
            Choose one of your {collections.length} collection{collections.length === 1 ? "" : "s"} in
            the sidebar.
          </p>
          <Button variant="primary" className="mt-6" onClick={openLibrarySidebar}>
            Open library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ChatEmptyHero
      collectionLabel={collectionName ? formatCollectionName(collectionName) : "your library"}
      showOnboarding={showOnboarding}
      onDismissOnboarding={onDismissOnboarding}
    />
  );
}

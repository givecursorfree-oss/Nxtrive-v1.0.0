import React from "react";
import {
  ArrowUp,
  Square,
  Mic,
  Globe,
  BrainCog,
  BookOpen,
  Paperclip,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { PromptMode } from "@/lib/chat-modes";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import {
  isPromptModesHintSeen,
  loadLastPromptMode,
  saveLastPromptMode,
  setPromptModesHintSeen,
} from "@/lib/storage";
import { getUploadAcceptAttribute, isSupportedUploadFile } from "@/lib/supported-extensions";
import { toast } from "@/store/useToastStore";
import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from "@/components/prompt-kit/file-upload";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => {
    const variantClasses = {
      default: "bg-card-white text-deep-ink hover:bg-paper-white",
      outline: "border border-mist bg-transparent hover:bg-paper-white",
      ghost: "bg-transparent hover:bg-paper-white",
    };

    return (
      <button
        type={type}
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
IconButton.displayName = "IconButton";

export interface PromptInputBoxProps {
  onSend?: (payload: { text: string; mode: PromptMode; files: File[] }) => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  showModeHint?: boolean;
  placeholder?: string;
  className?: string;
  "aria-describedby"?: string;
}

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>(
  (
    {
      onSend = () => {},
      onStop,
      isLoading = false,
      disabled = false,
      compact = false,
      showModeHint: showModeHintProp = true,
      placeholder = "Ask a question about your documents…",
      className,
      "aria-describedby": ariaDescribedBy,
    },
    ref,
  ) => {
    const [input, setInput] = React.useState("");
    const [files, setFiles] = React.useState<File[]>([]);
    const [mode, setMode] = React.useState<PromptMode>(() => loadLastPromptMode());
    const [showModeHint, setShowModeHint] = React.useState(
      () => showModeHintProp && !isPromptModesHintSeen(),
    );
    const promptBoxRef = React.useRef<HTMLDivElement>(null);
    const speechBaseRef = React.useRef("");

    const handleSpeechUpdate = React.useCallback(
      ({ text, isFinal }: { text: string; isFinal: boolean }) => {
        if (isFinal) {
          const next = speechBaseRef.current.trim()
            ? `${speechBaseRef.current.trim()} ${text}`
            : text;
          speechBaseRef.current = next;
          setInput(next);
          return;
        }
        const interim = speechBaseRef.current.trim()
          ? `${speechBaseRef.current.trim()} ${text}`
          : text;
        setInput(interim);
      },
      [],
    );

    const { supported: speechSupported, listening, toggle: toggleSpeech, stop: stopSpeech } =
      useSpeechInput(handleSpeechUpdate);

    React.useEffect(() => {
      if (isLoading && listening) stopSpeech();
    }, [isLoading, listening, stopSpeech]);

    const dismissModeHint = React.useCallback(() => {
      setShowModeHint(false);
      setPromptModesHintSeen();
    }, []);

    React.useEffect(() => {
      if (!showModeHintProp) {
        setShowModeHint(false);
      }
    }, [showModeHintProp]);

    const addFiles = React.useCallback((incoming: File[]) => {
      const supported = incoming.filter((file) => isSupportedUploadFile(file.name));
      const skipped = incoming.length - supported.length;
      if (skipped > 0) {
        toast(`${skipped} unsupported file${skipped === 1 ? "" : "s"} skipped`, "info");
      }
      if (supported.length > 0) {
        setFiles((prev) => [...prev, ...supported]);
      }
    }, []);

    const removeFile = (index: number) => {
      setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
    };

    const setModeToggle = (next: PromptMode) => {
      setMode((prev) => {
        const value = prev === next ? null : next;
        saveLastPromptMode(value);
        return value;
      });
      if (showModeHint) dismissModeHint();
    };

    const handleSubmit = () => {
      if (!input.trim() && files.length === 0) return;
      if (showModeHint) dismissModeHint();
      onSend({ text: input.trim(), mode, files });
      setInput("");
      setFiles([]);
      speechBaseRef.current = "";
    };

    const hasContent = input.trim() !== "" || files.length > 0;
    const isDisabled = disabled || isLoading;
    const inputDisabled = isDisabled;

    const modePlaceholder =
      listening
        ? "Listening…"
        : mode === "search"
          ? "Search across all indexed chunks…"
          : mode === "think"
            ? "Ask for a step-by-step answer…"
            : mode === "sources"
              ? "Ask with emphasis on citations…"
              : files.length > 0
                ? "Add a message about these files (optional)…"
                : placeholder;

    const modeConfig = {
      search: {
        label: "Search",
        tooltip: "Scan all indexed chunks for your question",
        icon: Globe,
      },
      think: {
        label: "Think",
        tooltip: "Step-by-step reasoned answer",
        icon: BrainCog,
      },
      sources: {
        label: "Citations",
        tooltip: "Prioritize answers with source citations",
        icon: BookOpen,
      },
    } as const;

    return (
      <FileUpload
        onFilesAdded={addFiles}
        accept={getUploadAcceptAttribute()}
        disabled={inputDisabled}
      >
        <PromptInput
          value={input}
          onValueChange={setInput}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          disabled={inputDisabled}
          className={cn(
            "w-full transition-all duration-300 ease-in-out",
            compact && "prompt-box-shell--compact",
            className,
          )}
          ref={ref ?? promptBoxRef}
        >
          {files.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pb-1">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-mist bg-paper-white px-3 py-2 type-body-sm text-carbon"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Paperclip className="size-4 shrink-0 text-slate" aria-hidden />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="rounded-full p-1 text-slate transition-colors hover:bg-mist/40 hover:text-deep-ink"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}

          <PromptInputTextarea
            placeholder={modePlaceholder}
            className={cn(compact ? "text-sm" : "text-base")}
            aria-describedby={ariaDescribedBy}
          />

          {!disabled && (
            <PromptInputActions
              className={cn(
                "prompt-box-toolbar flex items-center justify-between gap-3",
                compact ? "pt-0.5" : "pt-1",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <PromptInputAction tooltip="Attach files to index" side="top">
                  <FileUploadTrigger asChild>
                    <button
                      type="button"
                      className="prompt-mode-btn prompt-mode-btn--idle inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-transparent transition-all duration-200 ease-out"
                      aria-label="Attach files"
                    >
                      <Paperclip className="h-5 w-5 shrink-0 text-current" strokeWidth={1.75} />
                    </button>
                  </FileUploadTrigger>
                </PromptInputAction>

                <div className="prompt-mode-group" role="group" aria-label="Response mode">
                  {(["search", "think", "sources"] as const).map((key) => {
                    const active = mode === key;
                    const config = modeConfig[key];
                    const Icon = config.icon;
                    return (
                      <PromptInputAction
                        key={key}
                        tooltip={active ? `${config.label} on` : config.tooltip}
                        side="top"
                      >
                        <button
                          type="button"
                          onClick={() => setModeToggle(key)}
                          disabled={inputDisabled}
                          className={cn(
                            "prompt-mode-btn inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full transition-all duration-200 ease-out",
                            "min-h-11",
                            active ? "prompt-mode-btn--active px-3" : "prompt-mode-btn--idle min-w-11",
                          )}
                          aria-pressed={active}
                          aria-label={`${config.label}. ${config.tooltip}`}
                        >
                          <Icon
                            className={cn(
                              "prompt-mode-icon h-5 w-5 shrink-0",
                              active ? "text-forest-teal" : "text-current",
                            )}
                            strokeWidth={active ? 2.25 : 1.75}
                            aria-hidden
                          />
                          {active && (
                            <span className="prompt-mode-label type-caption font-semibold leading-none text-forest-teal">
                              {config.label}
                            </span>
                          )}
                        </button>
                      </PromptInputAction>
                    );
                  })}
                </div>
              </div>

              <PromptInputAction
                tooltip={
                  isLoading
                    ? "Stop generation"
                    : hasContent
                      ? "Send message"
                      : listening
                        ? "Stop listening"
                        : speechSupported
                          ? "Voice input"
                          : "Voice input not supported in this browser"
                }
              >
                <IconButton
                  variant="ghost"
                  className={cn(
                    "prompt-box-icon-btn shrink-0 transition-all duration-200 ease-out",
                    listening
                      ? "bg-ember-orange/15 text-ember-orange ring-2 ring-ember-orange/30"
                      : hasContent && !isLoading
                        ? "prompt-send-btn--ready"
                        : "prompt-mode-btn--idle bg-transparent",
                  )}
                  onClick={() => {
                    if (isLoading) onStop?.();
                    else if (hasContent) handleSubmit();
                    else if (speechSupported) {
                      speechBaseRef.current = input;
                      const started = toggleSpeech();
                      if (!started) {
                        toast("Could not start voice input. Check microphone permissions.", "error");
                      }
                    } else {
                      toast("Voice input is not supported in this browser.", "info");
                    }
                  }}
                  disabled={disabled && !isLoading}
                  aria-label={
                    isLoading
                      ? "Stop generation"
                      : hasContent
                        ? "Send message"
                        : listening
                          ? "Stop listening"
                          : "Voice input"
                  }
                  aria-pressed={listening}
                >
                  {isLoading ? (
                    <Square className="h-5 w-5 shrink-0 animate-pulse fill-deep-ink" />
                  ) : hasContent ? (
                    <ArrowUp className="h-5 w-5 shrink-0 text-current" />
                  ) : (
                    <Mic
                      className={cn(
                        "h-5 w-5 shrink-0 text-current",
                        listening && "text-ember-orange",
                      )}
                    />
                  )}
                </IconButton>
              </PromptInputAction>
            </PromptInputActions>
          )}

          {showModeHint && showModeHintProp && !disabled && (
            <div
              className="prompt-mode-hint mt-2 flex items-center justify-between gap-3 rounded-button border border-mist bg-paper-white/90 px-3 py-2.5"
              role="note"
            >
              <p className="type-body-sm text-slate">
                <span className="font-medium text-deep-ink">Search</span> scans all chunks ·{" "}
                <span className="font-medium text-deep-ink">Think</span> reasons step-by-step ·{" "}
                <span className="font-medium text-deep-ink">Citations</span> emphasizes sources
              </p>
              <button
                type="button"
                onClick={dismissModeHint}
                className="shrink-0 rounded-button px-2 py-1 type-body-sm font-medium text-deep-indigo hover:bg-pale-cyan-muted hover:text-midnight-teal"
              >
                Got it
              </button>
            </div>
          )}
        </PromptInput>

        <FileUploadContent />
      </FileUpload>
    );
  },
);

PromptInputBox.displayName = "PromptInputBox";

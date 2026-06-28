import {
  ChatBubbleLeftRightIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  LockClosedIcon,
  ServerStackIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

function PreviewShell({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "overflow-hidden rounded-xl border border-white/20 bg-[#f6f6f8] shadow-lg",
        className
      )}
    >
      {children}
    </div>
  );
}

function WindowChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#e3e4e8] bg-white px-3 py-2">
      <div className="flex gap-1" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-[#ec652b]/80" />
        <span className="h-2 w-2 rounded-full bg-[#f4df69]/90" />
        <span className="h-2 w-2 rounded-full bg-[#44b48b]/90" />
      </div>
      <span className="truncate text-[10px] font-medium text-[#7c7f88]">{title}</span>
    </div>
  );
}

/** Step 1 — privacy / local-only (back layer) */
export function PrivacyLocalPreview({ className }: { className?: string }) {
  return (
    <PreviewShell className={className} label="Documents stay on your machine">
      <WindowChrome title={BRAND_NAME} />
      <div className="space-y-3 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-[#167e6c]/25 bg-[#e8f6f9] px-2.5 py-2">
          <ShieldCheckIcon className="h-4 w-4 shrink-0 text-[#167e6c]" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#011821]">100% local</p>
            <p className="truncate text-[9px] text-[#7c7f88]">No cloud uploads</p>
          </div>
        </div>
        <div className="rounded-lg border border-[#e3e4e8] bg-white p-2.5">
          <div className="mb-2 flex items-center gap-1.5">
            <ServerStackIcon className="h-3.5 w-3.5 text-[#111a4a]" aria-hidden />
            <span className="text-[9px] font-medium text-[#011821]">Your machine</span>
          </div>
          <div className="space-y-1.5">
            {["Documents", "Embeddings", "Chat history"].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-md bg-[#f6f6f8] px-2 py-1"
              >
                <span className="text-[8px] text-[#3b3e47]">{item}</span>
                <LockClosedIcon className="h-3 w-3 text-[#167e6c]" aria-hidden />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

/** Step 1 — offline AI stack (front layer) */
export function OfflineAiPreview({ className }: { className?: string }) {
  return (
    <PreviewShell className={className} label="Offline AI with Ollama on your desktop">
      <WindowChrome title="Ollama · localhost" />
      <div className="space-y-2.5 p-3">
        <div className="flex items-center justify-between rounded-lg border border-dashed border-[#a9acb6] bg-white px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <CloudArrowUpIcon className="h-3.5 w-3.5 text-[#ec652b]" aria-hidden />
            <span className="text-[9px] font-medium text-[#ec652b]">Cloud APIs</span>
          </div>
          <span className="rounded-full bg-[#ec652b]/10 px-1.5 py-0.5 text-[8px] font-semibold text-[#ec652b]">
            Off
          </span>
        </div>
        <div className="rounded-lg border border-[#111a4a]/15 bg-white p-2.5">
          <p className="mb-1.5 text-[9px] font-semibold text-[#011821]">Local inference</p>
          <div className="flex flex-wrap gap-1">
            {["nomic-embed", "llama3.2"].map((model) => (
              <span
                key={model}
                className="rounded-full bg-[#111a4a] px-2 py-0.5 text-[8px] font-medium text-white"
              >
                {model}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[8px] text-[#7c7f88]">127.0.0.1 · no account required</p>
        </div>
      </div>
    </PreviewShell>
  );
}

/** Step 2 — library / folder picker (back layer) */
export function FolderPickerPreview({ className }: { className?: string }) {
  return (
    <PreviewShell className={className} label="Choose a folder to index">
      <WindowChrome title="Library" />
      <div className="flex min-h-[120px]">
        <div className="w-[38%] border-r border-[#e3e4e8] bg-white p-2">
          <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-wide text-[#7c7f88]">
            Collections
          </p>
          <div className="space-y-1">
            <div className="rounded-md bg-[#e8f6f9] px-2 py-1 text-[8px] font-medium text-[#167e6c]">
              Research
            </div>
            <div className="rounded-md px-2 py-1 text-[8px] text-[#7c7f88]">Legal docs</div>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-3">
          <FolderOpenIcon className="h-7 w-7 text-[#111a4a]" aria-hidden />
          <p className="text-center text-[9px] font-medium text-[#011821]">Choose folder</p>
          <span className="rounded-md bg-[#111a4a] px-2.5 py-1 text-[8px] font-medium text-white">
            Browse…
          </span>
        </div>
      </div>
    </PreviewShell>
  );
}

/** Step 2 — supported file types (front layer) */
export function FileTypesPreview({ className }: { className?: string }) {
  const types = [
    { ext: "PDF", color: "#ec652b" },
    { ext: "DOCX", color: "#111a4a" },
    { ext: "MD", color: "#167e6c" },
    { ext: ".py", color: "#9f7aee" },
    { ext: ".ts", color: "#7ea7e9" },
  ];

  return (
    <PreviewShell className={className} label="Supported document and code file types">
      <WindowChrome title="Drop files here" />
      <div className="p-3">
        <div className="mb-2 rounded-lg border border-dashed border-[#7ea7e9]/50 bg-[#e8f6f9]/60 px-2 py-3 text-center">
          <p className="text-[9px] font-medium text-[#011821]">Drag & drop a folder</p>
          <p className="mt-0.5 text-[8px] text-[#7c7f88]">or pick from disk</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {types.map(({ ext, color }) => (
            <span
              key={ext}
              className="inline-flex items-center gap-1 rounded-md border border-[#e3e4e8] bg-white px-1.5 py-0.5"
            >
              <DocumentTextIcon className="h-3 w-3" style={{ color }} aria-hidden />
              <span className="text-[8px] font-medium text-[#3b3e47]">{ext}</span>
            </span>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

/** Step 3 — indexing progress */
export function IndexingPreview({ className }: { className?: string }) {
  return (
    <PreviewShell className={className} label="Indexing progress with chunks created">
      <WindowChrome title="Indexing · Research" />
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[#167e6c]">Indexing…</span>
          <span className="text-[9px] font-medium text-[#7c7f88]">73%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#e3e4e8]">
          <div className="h-full w-[73%] rounded-full bg-[#111a4a]" />
        </div>
        <p className="truncate text-[8px] text-[#7c7f88]">contract-review-q3.pdf</p>
        <p className="text-[8px] text-[#7c7f88]">11 of 15 files · 248 chunks</p>
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {["Chunking", "Embedding", "Storing"].map((stage, i) => (
            <div
              key={stage}
              className={cn(
                "rounded-md px-1.5 py-1 text-center text-[7px] font-medium",
                i < 2 ? "bg-[#167e6c]/12 text-[#167e6c]" : "bg-[#f6f6f8] text-[#7c7f88]"
              )}
            >
              {stage}
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

/** Step 4 — chat with citations */
export function ChatCitationsPreview({ className }: { className?: string }) {
  return (
    <PreviewShell className={className} label="Chat with cited answers from your documents">
      <WindowChrome title="Chat · Research" />
      <div className="space-y-2 p-3">
        <div className="ml-auto max-w-[85%] rounded-lg border border-[#e3e4e8] bg-[#f6f6f8] px-2.5 py-2">
          <p className="text-[9px] text-[#011821]">What are the payment terms?</p>
        </div>
        <div className="flex gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#e8f6f9] text-[#167e6c]">
            <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 rounded-lg border border-[#e3e4e8] bg-white px-2.5 py-2">
            <p className="text-[9px] leading-relaxed text-[#12161e]">
              Net 30 from invoice date, with a 2% early-payment discount within 10 days.
            </p>
            <div className="mt-2 border-t border-[#e3e4e8] pt-2">
              <p className="mb-1 text-[8px] font-semibold text-[#011821]">Sources</p>
              <div className="flex flex-wrap gap-1">
                {["contract-review-q3.pdf", "vendor-agreement.docx"].map((file) => (
                  <span
                    key={file}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#e3e4e8] bg-[#f6f6f8] px-1.5 py-0.5"
                  >
                    <DocumentTextIcon className="h-2.5 w-2.5 shrink-0 text-[#167e6c]" aria-hidden />
                    <span className="truncate text-[7px] text-[#3b3e47]">{file}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

export function renderOnboardingStepPreview(step: number): React.ReactNode {
  switch (step) {
    case 0:
      return (
        <>
          <PrivacyLocalPreview className="absolute left-[4%] top-[10%] w-[52%] transition-transform duration-500 md:left-[5%] md:top-[8%] md:w-[48%] md:group-hover:translate-y-1" />
          <OfflineAiPreview className="absolute left-[38%] top-[26%] w-[58%] transition-transform duration-500 md:left-[42%] md:top-[22%] md:w-[54%] md:group-hover:-translate-y-3" />
        </>
      );
    case 1:
      return (
        <>
          <FolderPickerPreview className="absolute left-[4%] top-[12%] w-[52%] transition-transform duration-500 md:left-[5%] md:top-[10%] md:w-[48%] md:group-hover:translate-y-1" />
          <FileTypesPreview className="absolute left-[40%] top-[28%] w-[50%] transition-transform duration-500 md:left-[44%] md:top-[24%] md:w-[46%] md:group-hover:-translate-y-3" />
        </>
      );
    case 2:
      return (
        <IndexingPreview className="absolute left-[4%] top-[8%] w-[92%] md:left-[5%] md:top-[6%] md:w-[90%]" />
      );
    case 3:
      return (
        <ChatCitationsPreview className="absolute left-[4%] top-[6%] w-[92%] md:left-[5%] md:top-[4%] md:w-[90%]" />
      );
    default:
      return null;
  }
}

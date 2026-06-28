"use client";

import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FC,
  type ReactNode,
} from "react";
import { getFileExtension, getFileTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/prompt-kit/hover-card";

export const sourceVariants = cva(
  [
    "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md border font-medium transition-colors duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-indigo/30 focus-visible:ring-offset-1",
    "active:scale-[0.98] [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        outline:
          "border-mist bg-transparent text-slate hover:border-fog hover:bg-paper-white hover:text-deep-ink",
        ghost:
          "border-transparent bg-transparent text-slate hover:bg-paper-white hover:text-deep-ink",
        muted:
          "border-transparent bg-pale-cyan-muted text-deep-ink hover:bg-pale-cyan-muted/80",
        secondary:
          "border-mist bg-card-white text-carbon hover:bg-paper-white",
        info:
          "border-transparent bg-sky-blue/15 text-deep-indigo hover:bg-sky-blue/22",
        warning:
          "border-transparent bg-ember-orange/12 text-ember-orange hover:bg-ember-orange/18",
        success:
          "border-transparent bg-pale-cyan-muted text-forest-teal hover:bg-pale-cyan-muted/80",
        destructive:
          "border-transparent bg-ember-orange/10 text-ember-orange hover:bg-ember-orange/16",
      },
      size: {
        sm: "min-h-9 px-2 py-1 text-xs leading-snug [&_svg]:h-3.5 [&_svg]:w-3.5",
        default: "min-h-10 px-2.5 py-1 text-sm leading-snug [&_svg]:h-4 [&_svg]:w-4",
        lg: "min-h-11 px-3 py-1.5 text-sm leading-snug [&_svg]:h-4 [&_svg]:w-4",
      },
    },
    defaultVariants: {
      variant: "muted",
      size: "default",
    },
  },
);

export type SourceProps = Omit<VariantProps<typeof sourceVariants>, "variant"> &
  ComponentProps<"button"> & {
    asChild?: boolean;
    variant?: VariantProps<typeof sourceVariants>["variant"];
    size?: VariantProps<typeof sourceVariants>["size"];
  };

export function Source({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: SourceProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={type}
      className={cn(sourceVariants({ variant, size }), className)}
      {...props}
    />
  );
}

function extensionIconClass(path: string): string {
  const ext = getFileExtension(path);
  const map: Record<string, string> = {
    pdf: "source-icon--pdf",
    docx: "source-icon--doc",
    md: "source-icon--md",
    txt: "source-icon--txt",
    py: "source-icon--code",
    js: "source-icon--code",
    ts: "source-icon--code",
    tsx: "source-icon--code",
    json: "source-icon--data",
    csv: "source-icon--data",
  };
  return map[ext] ?? "source-icon--default";
}

export function SourceIcon({
  path,
  className,
  ...props
}: ComponentProps<"span"> & { path: string }) {
  return (
    <span
      className={cn(
        "source-icon inline-flex shrink-0 items-center justify-center rounded-md",
        extensionIconClass(path),
        className,
      )}
      {...props}
    >
      <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

export function SourceTitle({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn("min-w-0 truncate leading-snug", className)}
      {...props}
    />
  );
}

export type DocumentSourcePart = {
  sourceType: "document";
  path: string;
  title?: string;
};

export function toDocumentSourceParts(paths: string[]): DocumentSourcePart[] {
  return paths.map((path) => ({ sourceType: "document", path }));
}

export type SourceMessagePartProps = DocumentSourcePart & {
  onPreview?: (path: string) => void;
  variant?: VariantProps<typeof sourceVariants>["variant"];
  size?: VariantProps<typeof sourceVariants>["size"];
};

function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

interface SourceBadgeProps {
  path: string;
  title?: string;
  onPreview?: (path: string) => void;
  variant?: VariantProps<typeof sourceVariants>["variant"];
  size?: VariantProps<typeof sourceVariants>["size"];
  className?: string;
}

const SourceBadge: FC<SourceBadgeProps> = ({
  path,
  title,
  onPreview,
  variant = "muted",
  size = "default",
  className,
}) => {
  const fileName = title || basename(path);
  const fileType = getFileTypeLabel(path);

  const handleClick = () => {
    onPreview?.(path);
  };

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <Source
          variant={variant}
          size={size}
          onClick={handleClick}
          title={onPreview ? `Preview ${fileName}` : path}
          aria-label={onPreview ? `Preview source ${fileName}` : fileName}
          className={cn(onPreview && "cursor-pointer", className)}
        >
          <SourceIcon path={path} className="h-5 w-5 rounded-sm" />
          <SourceTitle className="max-w-[37.5rem]">{fileName}</SourceTitle>
        </Source>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0" align="start">
        <div className="flex flex-col gap-2 p-4">
          <p className="type-body-sm font-medium text-deep-ink">{fileName}</p>
          <p className="type-caption text-helper">{fileType} document</p>
          <p className="break-all type-mono-xs text-helper">{path}</p>
          {onPreview && (
            <p className="type-caption font-medium text-forest-teal">Click to preview in app</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export interface SourcesGroupProps {
  paths: string[];
  onPreview?: (path: string) => void;
  className?: string;
  label?: ReactNode;
  variant?: VariantProps<typeof sourceVariants>["variant"];
  size?: VariantProps<typeof sourceVariants>["size"];
}

export const SourcesGroup: FC<SourcesGroupProps> = ({
  paths,
  onPreview,
  className,
  label = "Sources",
  variant = "muted",
  size = "sm",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container || paths.length === 0) return;

    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    const firstTop = children[0].offsetTop;
    let rowCount = 1;
    let prevTop = firstTop;
    let cutoff = children.length;

    for (let i = 1; i < children.length; i++) {
      const childTop = children[i].offsetTop;
      if (childTop > prevTop) {
        rowCount++;
        prevTop = childTop;
        if (rowCount > 2) {
          cutoff = i;
          break;
        }
      }
    }

    setVisibleCount(rowCount > 2 ? cutoff : null);
  }, [paths.length]);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  if (paths.length === 0) return null;

  const shouldCollapse = visibleCount !== null && visibleCount < paths.length;
  const displayedPaths =
    expanded || !shouldCollapse ? paths : paths.slice(0, visibleCount);
  const hiddenCount = paths.length - (visibleCount ?? paths.length);

  return (
    <section
      className={cn("message-sources relative mt-4", className)}
      aria-label="Sources"
    >
      <p className="message-sources__label type-body-sm font-semibold text-deep-ink">
        {label}
        <span className="ml-1.5 font-medium text-slate">({paths.length})</span>
      </p>

      <div
        ref={containerRef}
        className="message-sources__measure pointer-events-none absolute -left-[9999px] top-0 flex max-w-full flex-wrap gap-2 opacity-0"
        aria-hidden="true"
      >
        {paths.map((path) => (
          <SourceBadge
            key={`measure-${path}`}
            path={path}
            onPreview={onPreview}
            variant={variant}
            size={size}
          />
        ))}
      </div>

      <ul className="message-sources__list mt-3 flex flex-wrap gap-2" role="list">
        {displayedPaths.map((path) => (
          <li key={path} className="min-w-0 max-w-full">
            <SourceBadge
              path={path}
              onPreview={onPreview}
              variant={variant}
              size={size}
            />
          </li>
        ))}
        {shouldCollapse && !expanded && (
          <li>
            <Source
              type="button"
              variant="ghost"
              size={size}
              onClick={() => setExpanded(true)}
              className="text-slate hover:text-deep-ink"
              aria-expanded={false}
            >
              +{hiddenCount} more
            </Source>
          </li>
        )}
        {shouldCollapse && expanded && (
          <li>
            <Source
              type="button"
              variant="ghost"
              size={size}
              onClick={() => setExpanded(false)}
              className="text-slate hover:text-deep-ink"
              aria-expanded={true}
            >
              Show less
            </Source>
          </li>
        )}
      </ul>
    </section>
  );
};

const SourcesImpl: FC<SourceMessagePartProps> = (part) => {
  if (part.sourceType !== "document" || !part.path) return null;

  return (
    <SourceBadge
      path={part.path}
      title={part.title}
      onPreview={part.onPreview}
      variant={part.variant}
      size={part.size}
    />
  );
};

type SourcesComponent = FC<SourceMessagePartProps> & {
  Root: typeof Source;
  Icon: typeof SourceIcon;
  Title: typeof SourceTitle;
  Group: typeof SourcesGroup;
};

const Sources = memo(SourcesImpl) as unknown as SourcesComponent;

Sources.displayName = "Sources";
Sources.Root = Source;
Sources.Icon = SourceIcon;
Sources.Title = SourceTitle;
Sources.Group = SourcesGroup;

export { Sources, SourceBadge };
